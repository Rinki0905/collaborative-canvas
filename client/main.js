const socket = io();

// --- Canvas Elements ---
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const cursorCanvas = document.getElementById('cursor-canvas'); // New
const cursorCtx = cursorCanvas.getContext('2d'); // New

// --- Tool References ---
const colorPicker = document.getElementById('color-picker');
const widthPicker = document.getElementById('width-picker');
const brushBtn = document.getElementById('brush-btn');
const eraserBtn = document.getElementById('eraser-btn');
const undoBtn = document.getElementById('undo-btn'); // NEW
const redoBtn = document.getElementById('redo-btn');

if (!ctx || !cursorCtx || !colorPicker || !widthPicker || !brushBtn || !eraserBtn) {
    throw new Error('Could not find one or more UI elements');
}

// --- Drawing State ---
let isDrawing = false;
let currentPath = []; 
let currentTool = 'brush';
let currentColor = colorPicker.value;
let currentWidth = widthPicker.value;

// --- Cursor State  ---
const otherUsers = new Map(); 
const userColors = {}; 
const aColors = ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', '#E6B333', '#3366E6', '#999966'];
const getUserColor = (userId) => {
    if (!userColors[userId]) {
        userColors[userId] = aColors[Math.floor(Math.random() * aColors.length)];
    }
    return userColors[userId];
};

// --- Tool Event Listeners ---
colorPicker.addEventListener('input', (e) => (currentColor = e.target.value));
widthPicker.addEventListener('input', (e) => (currentWidth = e.target.value));

brushBtn.addEventListener('click', () => {
    currentTool = 'brush';
    brushBtn.classList.add('active');
    eraserBtn.classList.remove('active');
});

eraserBtn.addEventListener('click', () => {
    currentTool = 'eraser';
    eraserBtn.classList.add('active');
    brushBtn.classList.remove('active');
});

// --- NEW: Set the brush as active by default ---
brushBtn.classList.add('active');

// --- NEW: Undo/Redo Event Listeners ---
undoBtn.addEventListener('click', () => {
    socket.emit('canvas:undo');
});

redoBtn.addEventListener('click', () => {
    socket.emit('canvas:redo');
});

// --- Canvas Sizing ---
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cursorCanvas.width = window.innerWidth; // Resize cursor canvas too
    cursorCanvas.height = window.innerHeight; // Resize cursor canvas too
    
    // Redraw history on resize
    socket.emit('request:history'); // We'll add this to the server
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial resize

// --- Drawing Functions ---
function setContext(context, tool, width, color) {
    context.lineWidth = width;
    context.strokeStyle = color;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
}

// This function draws a complete path from a DrawAction object
function drawPath(action) {
    setContext(ctx, action.tool, action.lineWidth, action.color);
    ctx.beginPath();
    if (action.points.length === 0) return;
    
    ctx.moveTo(action.points[0].x, action.points[0].y);
    for (let i = 1; i < action.points.length; i++) {
        ctx.lineTo(action.points[i].x, action.points[i].y);
    }
    ctx.stroke();
    ctx.closePath();
}

// --- Drawing Functions ---

function handleDrawStart(x, y) {
    isDrawing = true;
    currentPath = [{ x, y }]; // Start new path
    
    setContext(ctx, currentTool, currentWidth, currentColor);
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function handleDrawMove(x, y) {
    if (!isDrawing) return;
    
    const point = { x, y };
    currentPath.push(point); // Add point to path
    
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
}

function handleDrawStop() {
    if (!isDrawing) return;
    isDrawing = false;
    ctx.closePath();

    // --- EMIT THE COMPLETE ACTION ---
    if (currentPath.length > 1) {
        socket.emit('draw:action', {
            id: `${socket.id}-${Date.now()}`, 
            tool: currentTool,
            color: currentColor,
            lineWidth: currentWidth,
            points: currentPath,
        });
    }
    currentPath = []; 
}

// --- Local Mouse Listeners ---

let canvasRect = canvas.getBoundingClientRect();
window.addEventListener('resize', () => {
    canvasRect = canvas.getBoundingClientRect();
});

// Mouse Events
canvas.addEventListener('mousedown', (e) => {
    handleDrawStart(e.offsetX, e.offsetY);
});
canvas.addEventListener('mousemove', (e) => {
    handleDrawMove(e.offsetX, e.offsetY);
});
canvas.addEventListener('mouseup', handleDrawStop);
canvas.addEventListener('mouseleave', handleDrawStop);

// Touch Events
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    // Calculate position relative to the canvas
    const x = touch.clientX - canvasRect.left;
    const y = touch.clientY - canvasRect.top;
    handleDrawStart(x, y);
});

canvas.addEventListener('touchmove', (e) => {
    // *** CRITICAL: Prevent the page from scrolling while drawing ***
    e.preventDefault(); 

    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const x = touch.clientX - canvasRect.left;
    const y = touch.clientY - canvasRect.top;
    handleDrawMove(x, y);
});

canvas.addEventListener('touchend', handleDrawStop);
canvas.addEventListener('touchcancel', handleDrawStop);

// --- Cursor Tracking (New) ---
document.addEventListener('mousemove', (e) => {
    socket.emit('cursor:move', { x: e.pageX, y: e.pageY });
});

function drawCursors() {
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
    
    for (const [userId, userData] of otherUsers.entries()) {
        const color = getUserColor(userId);
        cursorCtx.fillStyle = color;
        cursorCtx.beginPath();
        cursorCtx.arc(userData.x, userData.y, 5, 0, Math.PI * 2);
        cursorCtx.fill();
        
        cursorCtx.font = '12px Arial';
        cursorCtx.fillText(userId.substring(0, 5), userData.x + 10, userData.y + 5);
    }
    
    requestAnimationFrame(drawCursors); 
}
requestAnimationFrame(drawCursors); 


// --- SOCKET.IO LISTENERS (Receiving from server) ---

socket.on('connect', () => {
    console.log('Canvas ready. Socket connected:', socket.id);
});

// 1. Load the entire history
socket.on('canvas:load', (history) => {
    console.log('Loading history...', history.length, 'actions');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const action of history) {
        drawPath(action);
    }
});

// 2. Listen for a new action from someone else
socket.on('draw:action', (action) => {
   
    drawPath(action); 
});

// 3. Listen for other cursors
socket.on('cursor:move', (data) => {
    otherUsers.set(data.userId, { x: data.x, y: data.y });
});

// 4. Remove cursor when user disconnects
socket.on('user:disconnect', (userId) => {
    otherUsers.delete(userId);
});

// This is for our resize function
socket.on('disconnect', () => {
    console.log('Socket disconnected');
    otherUsers.clear(); 
});