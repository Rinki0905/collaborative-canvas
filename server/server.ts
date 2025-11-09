import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { addAction, getHistory, DrawAction, undo, redo } from './drawing-state'; 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const clientPath = path.join(__dirname,  '..', 'client');
app.use(express.static(clientPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // --- 1. Send the entire history to the new user ---
  socket.emit('canvas:load', getHistory());

  // --- 2. Listen for a completed drawing action from a user ---
  socket.on('draw:action', (action: DrawAction) => {
    // Add it to our server-side history
    addAction(action);
    // Broadcast the new action to everyone ELSE
    socket.broadcast.emit('draw:action', action);
  });

  socket.on('request:history', () => {
    socket.emit('canvas:load', getHistory());
  });

  // --- 3. Listen for cursor movement ---
  socket.on('cursor:move', (data: { x: number; y: number }) => {
    socket.broadcast.emit('cursor:move', {
      ...data,
      userId: socket.id,
    });

    socket.on('canvas:undo', () => {
    if (undo()) { // Call our undo function
        io.emit('canvas:load', getHistory());
    }
  });
  
  // --- 6. NEW: Handle Redo Request ---
  socket.on('canvas:redo', () => {
    if (redo()) { // Call our redo function
        io.emit('canvas:load', getHistory());
    }
  });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    socket.broadcast.emit('user:disconnect', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});