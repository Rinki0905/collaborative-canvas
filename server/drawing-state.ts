export interface DrawAction {
    id: string;
    tool: 'brush' | 'eraser';
    color: string;
    lineWidth: number;
    points: { x: number; y: number }[];
}

const history: DrawAction[] = [];
const redoStack: DrawAction[] = []; // NEW: Store undone actions

// --- Public Functions ---

export function addAction(action: DrawAction) {
    history.push(action);
    // When a new action is drawn, the redo stack must be cleared
    redoStack.length = 0; 
}

export function getHistory(): Readonly<DrawAction[]> {
    return history;
}

// --- NEW: Undo Function ---
/** Moves the last action from history to redoStack */
export function undo(): boolean {
    if (history.length === 0) {
        return false; // Nothing to undo
    }
    const undoneAction = history.pop();
    if (undoneAction) {
        redoStack.push(undoneAction);
        return true;
    }
    return false;
}

// --- NEW: Redo Function ---
/** Moves the last action from redoStack back to history */
export function redo(): boolean {
    if (redoStack.length === 0) {
        return false; // Nothing to redo
    }
    const redoneAction = redoStack.pop();
    if (redoneAction) {
        history.push(redoneAction);
        return true;
    }
    return false;
}

export function clearHistory() {
    history.length = 0;
    redoStack.length = 0;
}