# Application Architecture

This document outlines the architecture, data flow, and technical decisions for the Real-Time Collaborative Canvas.

## 1. Data Flow Diagram

The application uses a client-server model with a server-authoritative state. All actions are processed by the server and then broadcast to other clients to ensure consistency.

**Drawing Action Flow:**
1.  `Client A` (mousedown + mousemove): User draws on their local canvas. Points are collected in a `currentPath` array.
2.  `Client A` (mouseup): The complete `DrawAction` object (containing all points, color, tool, etc.) is sent to the server via a `draw:action` WebSocket event.
3.  `Server`: Receives `draw:action`. It calls `addAction()` to push the action onto the central `history` array.
4.  `Server`: Broadcasts the *same* `DrawAction` object to *all other clients* via a `draw:action` event.
5.  `Client B, C, ...`: Receive `draw:action` and call their local `drawPath()` function to render the stroke on their canvases.

**New User Connection Flow:**
1.  `Client B` connects to the server.
2.  `Server`: Detects the `connection` event.
3.  `Server`: Calls `getHistory()` to retrieve the complete drawing history.
4.  `Server`: Emits a `canvas:load` event *only to Client B*, sending the entire `history` array.
5.  `Client B`: Receives `canvas:load`, clears its canvas, and loops through the `history` array, calling `drawPath()` for each action to instantly rebuild the canvas state.

## 2. WebSocket Protocol (API)

Here are the key WebSocket events used in the application.

### Client-to-Server (C -> S)

| Event | Data Payload | Description |
| :--- | :--- | :--- |
| `draw:action` | `DrawAction` object | Sent on `mouseup` after a user finishes drawing a path. |
| `cursor:move` | `{ x: number, y: number }` | Sent on `mousemove` to update the user's cursor position. |
| `canvas:undo` | (none) | Sent when a user clicks the "Undo" button. |
| `canvas:redo` | (none) | Sent when a user clicks the "Redo" button. |
| `request:history`| (none) | Sent by a client (e.g., on resize) to request the full history again. |

### Server-to-Client (S -> C)

| Event | Data Payload | Description |
| :--- | :--- | :--- |
| `canvas:load` | `DrawAction[]` (history) | Sent to a single client on connect, or to *all* clients after an undo/redo. |
| `draw:action` | `DrawAction` object | Broadcast to all *other* clients after a new action is received. |
| `cursor:move` | `{ x, y, userId }` | Broadcast to all *other* clients to show a user's cursor. |
| `user:disconnect`| `string` (userId) | Broadcast to all *other* clients so they can remove a user's cursor. |

## 3. Undo/Redo Strategy

The global undo/redo system is **fully server-authoritative** to maintain a single source of truth.

* **State:** The server maintains two arrays: `history: DrawAction[]` and `redoStack: DrawAction[]`.
* **Undo:**
    1.  A client sends `canvas:undo`.
    2.  The server `pops` the last `DrawAction` from `history` and `pushes` it onto the `redoStack`.
    3.  The server then emits `canvas:load` to **all** clients, sending the *new, shorter* `history`.
    4.  All clients receive this event, clear their canvas, and redraw the entire new history.
* **Redo:**
    1.  A client sends `canvas:redo`.
    2.  The server `pops` the last `DrawAction` from `redoStack` and `pushes` it onto the `history`.
    3.  The server emits `canvas:load` to **all** clients, sending the *new, longer* `history`.
* **New Action:** When a *new* `draw:action` is received, the `redoStack` is cleared.

This approach prevents conflicts. No client can ever be out of sync, as they are *always* forced to redraw the server's official state.

## 4. Performance Decisions

* **Layered Canvases:** Two canvases are used. The main `drawing-canvas` is for the persistent drawing, and a top-layer `cursor-canvas` is for non-persistent cursors. This prevents us from having to redraw the *entire* drawing history just to move a cursor, which would be extremely slow. The `cursor-canvas` is cleared and redrawn in a `requestAnimationFrame` loop.
* **Data Serialization:** Instead of sending every single `mousemove` point over WebSockets (which would flood the network), clients collect all points for a single path locally. Only on `mouseup` is the complete `DrawAction` object sent, containing an array of all points. This is much more efficient.

## 5. Conflict Resolution

Simultaneous drawing is handled by the server's sequential processing.

* If `User A` and `User B` finish drawing at the exact same time, the server's event loop will process one `draw:action` event first, then the other.
* The server adds `Action A` to the history and broadcasts it.
* Then, it adds `Action B` to the history and broadcasts it.
* All clients will receive `Action A` and then `Action B`, ensuring their canvases are identical. There is no "conflict" because the server establishes the official order.