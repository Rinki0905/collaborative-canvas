# Real-Time Collaborative Canvas

This is a submission for the real-time drawing application assignment. It features a multi-user canvas where drawings are synced live, along with live cursors and a global undo/redo system.

Built with Node.js, Express, Socket.io, and Vanilla JS/HTML Canvas.

##  Core Features

* **Real-Time Drawing:** Strokes appear on all clients' screens instantly.
* **Live Cursors:** See where other users are pointing in real-time.
* **State Sync:** New users immediately receive the full drawing history.
* **Global Undo/Redo:** Any user can undo or redo an action for *all* connected users.
* **Tools:** Includes a brush, eraser, color picker, and stroke width slider.

##  Setup & Run

Follow these steps to run the project locally.

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-link>
    cd collaborative-canvas
    ```

2.  **Install dependencies:**
    (This installs both server and client dependencies)
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **View the application:**
    Open your browser and go to `http://localhost:3000`.

##  How to Test (Multiple Users)

To test the collaborative features, simply open `http://localhost:3000` in two or more separate browser windows (or incognito tabs).

* Draw in one window and watch it appear in the other.
* Move your mouse in one window and see the cursor appear in the other.
* Click "Undo" in one window and watch the last stroke disappear from both.

##  Time Spent

* **Total Time:** [Estimate your total hours, e.g., "Approx. 10 hours"]

## Known Limitations / Bugs

* [Be honest here. e.g., "Eraser can feel slightly delayed on high-latency connections."]
* [e.g., "Cursor animation loop runs even when the tab is not active."]
* [e.g., "The server's drawing history is in-memory and will be lost on restart."]