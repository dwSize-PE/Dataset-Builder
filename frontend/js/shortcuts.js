/**
 * Keyboard shortcuts module.
 */
const Shortcuts = {
    shortcutsPanelVisible: true,

    init() {
        document.addEventListener('keydown', (e) => this._handleKey(e));
    },

    _handleKey(e) {
        // Ignore if typing in input/select
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

        const key = e.key.toLowerCase();

        // Ctrl combos
        if (e.ctrlKey || e.metaKey) {
            if (key === 'z') {
                e.preventDefault();
                CanvasManager.undo();
                return;
            }
            if (key === 's') {
                e.preventDefault();
                AppState.saveCurrentAnnotation();
                return;
            }
            return;
        }

        // Single keys
        switch (key) {
            case 'd':
            case 'arrowright':
                e.preventDefault();
                AppState.nextFrame();
                break;
            case 'a':
            case 'arrowleft':
                e.preventDefault();
                AppState.prevFrame();
                break;
            case 'x':
                e.preventDefault();
                AppState.skipFrame();
                break;
            case 'b':
                e.preventDefault();
                // Mode box already active in MVP
                break;
            case 'delete':
            case 'backspace':
                e.preventDefault();
                if (e.shiftKey) {
                    AppState.deleteCurrentFrame();
                } else {
                    CanvasManager.removeSelected();
                }
                break;
            case 'escape':
                e.preventDefault();
                CanvasManager.cancelDrawing();
                CanvasManager.selectBox(-1);
                break;
            case 'h':
                e.preventDefault();
                this.toggleShortcuts();
                break;
            default:
                // Number keys for class selection
                if (/^[1-9]$/.test(key)) {
                    e.preventDefault();
                    const classIdx = parseInt(key) - 1;
                    AppState.setActiveClass(classIdx);
                }
                break;
        }
    },

    toggleShortcuts() {
        const panel = document.getElementById('shortcuts-panel');
        this.shortcutsPanelVisible = !this.shortcutsPanelVisible;
        panel.style.display = this.shortcutsPanelVisible ? 'block' : 'none';
    },
};
