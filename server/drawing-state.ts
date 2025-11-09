export interface DrawAction {
    id: string;
    tool: 'brush' | 'eraser';
    color: string;
    lineWidth: number;
    points: { x: number; y: number }[];
}

const history: DrawAction[] = [];
const redoStack: DrawAction[] = []; 

export function addAction(action: DrawAction) {
    history.push(action);
    redoStack.length = 0; 
}

export function getHistory(): Readonly<DrawAction[]> {
    return history;
}

/** Moves the last action from history to redoStack */
export function undo(): boolean {
    if (history.length === 0) {
        return false; 
    }
    const undoneAction = history.pop();
    if (undoneAction) {
        redoStack.push(undoneAction);
        return true;
    }
    return false;
}

/** Moves the last action from redoStack back to history */
export function redo(): boolean {
    if (redoStack.length === 0) {
        return false; 
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