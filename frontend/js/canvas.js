/**
 * Canvas module — drawing bounding boxes, crosshair, image rendering.
 */
const CanvasManager = {
    canvas: null,
    ctx: null,
    wrapper: null,
    image: null,

    // Image transform (for fitting image in canvas)
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    imgWidth: 0,
    imgHeight: 0,

    // Drawing state
    isDrawing: false,
    drawStart: null,   // { x, y } in image coords
    mousePos: null,    // { x, y } in canvas coords for crosshair

    // Resize state
    isResizing: false,
    resizeHandle: null,  // 'tl','t','tr','r','br','b','bl','l'
    resizeBoxIndex: -1,
    resizeOrigBox: null, // original box before resize
    HANDLE_SIZE: 8,      // px in canvas space

    // Drag/move state
    isDragging: false,
    dragOffset: null,    // { x, y } offset from box origin in image coords

    // Boxes for current frame: [{ class_id, class_name, x, y, w, h }]
    boxes: [],
    selectedBoxIndex: -1,
    undoStack: [],

    // Callbacks
    onBoxesChanged: null,

    init(canvasId, wrapperId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.wrapper = document.getElementById(wrapperId);

        this._setupResize();
        this._setupMouse();
    },

    _setupResize() {
        const resize = () => {
            const rect = this.wrapper.getBoundingClientRect();
            this.canvas.width = rect.width;
            this.canvas.height = rect.height;
            this._computeTransform();
            this.render();
        };

        window.addEventListener('resize', resize);
        // Initial
        setTimeout(resize, 50);
    },

    _computeTransform() {
        if (!this.image) return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;
        const iw = this.image.naturalWidth;
        const ih = this.image.naturalHeight;

        this.imgWidth = iw;
        this.imgHeight = ih;

        // Fit image in canvas keeping aspect ratio
        this.scale = Math.min(cw / iw, ch / ih);
        this.offsetX = (cw - iw * this.scale) / 2;
        this.offsetY = (ch - ih * this.scale) / 2;
    },

    // Convert canvas coords to image coords
    canvasToImage(cx, cy) {
        return {
            x: (cx - this.offsetX) / this.scale,
            y: (cy - this.offsetY) / this.scale,
        };
    },

    // Convert image coords to canvas coords
    imageToCanvas(ix, iy) {
        return {
            x: ix * this.scale + this.offsetX,
            y: iy * this.scale + this.offsetY,
        };
    },

    loadImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.image = img;
                this._computeTransform();
                this.render();
                resolve();
            };
            img.src = url;
        });
    },

    setBoxes(boxes) {
        this.boxes = boxes.map(b => ({ ...b }));
        this.selectedBoxIndex = -1;
        this.undoStack = [];
        this.render();
        this._notifyChanged();
    },

    getBoxes() {
        return this.boxes.map(b => ({ ...b }));
    },

    addBox(box) {
        this._pushUndo();
        this.boxes.push({ ...box });
        this.selectedBoxIndex = this.boxes.length - 1;
        this.render();
        this._notifyChanged();
    },

    removeBox(index) {
        if (index < 0 || index >= this.boxes.length) return;
        this._pushUndo();
        this.boxes.splice(index, 1);
        this.selectedBoxIndex = -1;
        this.render();
        this._notifyChanged();
    },

    removeSelected() {
        if (this.selectedBoxIndex >= 0) {
            this.removeBox(this.selectedBoxIndex);
        }
    },

    clearBoxes() {
        this._pushUndo();
        this.boxes = [];
        this.selectedBoxIndex = -1;
        this.render();
        this._notifyChanged();
    },

    undo() {
        if (this.undoStack.length === 0) return;
        this.boxes = this.undoStack.pop();
        this.selectedBoxIndex = -1;
        this.render();
        this._notifyChanged();
    },

    selectBox(index) {
        this.selectedBoxIndex = index;
        this.render();
        this._notifyChanged();
    },

    _pushUndo() {
        this.undoStack.push(this.boxes.map(b => ({ ...b })));
        if (this.undoStack.length > 50) this.undoStack.shift();
    },

    _notifyChanged() {
        if (this.onBoxesChanged) this.onBoxesChanged(this.boxes, this.selectedBoxIndex);
    },

    // ---- Mouse Handlers ----
    _setupMouse() {
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        this.canvas.addEventListener('mouseleave', () => {
            this.mousePos = null;
            this.render();
        });
    },

    _getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    },

    _onMouseDown(e) {
        if (e.button !== 0) return; // Left click only
        const pos = this._getCanvasPos(e);
        const imgPos = this.canvasToImage(pos.x, pos.y);

        // 1. Check if clicking on a resize handle of the selected box
        if (this.selectedBoxIndex >= 0) {
            const handle = this._getHandleAt(pos.x, pos.y, this.selectedBoxIndex);
            if (handle) {
                this._pushUndo();
                this.isResizing = true;
                this.resizeHandle = handle;
                this.resizeBoxIndex = this.selectedBoxIndex;
                this.resizeOrigBox = { ...this.boxes[this.selectedBoxIndex] };
                return;
            }
        }

        // 2. Check if clicking inside the selected box (drag/move)
        if (this.selectedBoxIndex >= 0) {
            const b = this.boxes[this.selectedBoxIndex];
            if (imgPos.x >= b.x && imgPos.x <= b.x + b.w && imgPos.y >= b.y && imgPos.y <= b.y + b.h) {
                this._pushUndo();
                this.isDragging = true;
                this.dragOffset = { x: imgPos.x - b.x, y: imgPos.y - b.y };
                return;
            }
        }

        // 3. Check if clicking on another existing box
        const clickedIdx = this._findBoxAt(imgPos.x, imgPos.y);
        if (clickedIdx >= 0 && !e.shiftKey) {
            this.selectBox(clickedIdx);
            return;
        }

        // 4. Start drawing new box
        if (!AppState || !AppState.activeClass) return;
        this.isDrawing = true;
        this.drawStart = imgPos;
    },

    _onMouseMove(e) {
        const pos = this._getCanvasPos(e);
        const imgPos = this.canvasToImage(pos.x, pos.y);
        this.mousePos = pos;

        // Resizing
        if (this.isResizing && this.resizeBoxIndex >= 0) {
            this._doResize(imgPos);
            this.render();
            return;
        }

        // Dragging
        if (this.isDragging && this.selectedBoxIndex >= 0) {
            const b = this.boxes[this.selectedBoxIndex];
            let newX = imgPos.x - this.dragOffset.x;
            let newY = imgPos.y - this.dragOffset.y;
            // Clamp to image bounds
            newX = Math.max(0, Math.min(newX, this.imgWidth - b.w));
            newY = Math.max(0, Math.min(newY, this.imgHeight - b.h));
            b.x = newX;
            b.y = newY;
            this.render();
            this._notifyChanged();
            return;
        }

        // Update cursor based on hover
        this._updateCursor(pos);

        this.render();
    },

    _onMouseUp(e) {
        // Finish resize
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.resizeOrigBox = null;
            this._notifyChanged();
            return;
        }

        // Finish drag
        if (this.isDragging) {
            this.isDragging = false;
            this.dragOffset = null;
            this._notifyChanged();
            return;
        }

        // Finish drawing
        if (!this.isDrawing) return;
        this.isDrawing = false;

        const pos = this._getCanvasPos(e);
        const imgPos = this.canvasToImage(pos.x, pos.y);
        const start = this.drawStart;

        if (!start) return;

        // Calculate box in image coords
        const x = Math.min(start.x, imgPos.x);
        const y = Math.min(start.y, imgPos.y);
        const w = Math.abs(imgPos.x - start.x);
        const h = Math.abs(imgPos.y - start.y);

        // Minimum size check (at least 5px in image space)
        if (w < 5 || h < 5) {
            this.drawStart = null;
            return;
        }

        // Clamp to image bounds
        const box = {
            class_id: AppState.activeClass.id,
            class_name: AppState.activeClass.name,
            x: Math.max(0, x),
            y: Math.max(0, y),
            w: Math.min(w, this.imgWidth - Math.max(0, x)),
            h: Math.min(h, this.imgHeight - Math.max(0, y)),
        };

        this.addBox(box);
        this.drawStart = null;
    },

    cancelDrawing() {
        this.isDrawing = false;
        this.isResizing = false;
        this.isDragging = false;
        this.drawStart = null;
        this.resizeHandle = null;
        this.dragOffset = null;
        this.render();
    },

    // ---- Resize Handles ----
    _getHandlePositions(boxIndex) {
        const b = this.boxes[boxIndex];
        if (!b) return [];
        const tl = this.imageToCanvas(b.x, b.y);
        const br = this.imageToCanvas(b.x + b.w, b.y + b.h);
        const mx = (tl.x + br.x) / 2;
        const my = (tl.y + br.y) / 2;

        return [
            { id: 'tl', x: tl.x, y: tl.y, cursor: 'nwse-resize' },
            { id: 't',  x: mx,   y: tl.y, cursor: 'ns-resize' },
            { id: 'tr', x: br.x, y: tl.y, cursor: 'nesw-resize' },
            { id: 'r',  x: br.x, y: my,   cursor: 'ew-resize' },
            { id: 'br', x: br.x, y: br.y, cursor: 'nwse-resize' },
            { id: 'b',  x: mx,   y: br.y, cursor: 'ns-resize' },
            { id: 'bl', x: tl.x, y: br.y, cursor: 'nesw-resize' },
            { id: 'l',  x: tl.x, y: my,   cursor: 'ew-resize' },
        ];
    },

    _getHandleAt(cx, cy, boxIndex) {
        const handles = this._getHandlePositions(boxIndex);
        const hs = this.HANDLE_SIZE;
        for (const h of handles) {
            if (Math.abs(cx - h.x) <= hs && Math.abs(cy - h.y) <= hs) {
                return h.id;
            }
        }
        return null;
    },

    _doResize(imgPos) {
        const b = this.boxes[this.resizeBoxIndex];
        const orig = this.resizeOrigBox;
        if (!b || !orig) return;

        const minSize = 5;

        switch (this.resizeHandle) {
            case 'tl':
                b.x = Math.min(imgPos.x, orig.x + orig.w - minSize);
                b.y = Math.min(imgPos.y, orig.y + orig.h - minSize);
                b.w = orig.x + orig.w - b.x;
                b.h = orig.y + orig.h - b.y;
                break;
            case 't':
                b.y = Math.min(imgPos.y, orig.y + orig.h - minSize);
                b.h = orig.y + orig.h - b.y;
                break;
            case 'tr':
                b.w = Math.max(minSize, imgPos.x - orig.x);
                b.y = Math.min(imgPos.y, orig.y + orig.h - minSize);
                b.h = orig.y + orig.h - b.y;
                break;
            case 'r':
                b.w = Math.max(minSize, imgPos.x - orig.x);
                break;
            case 'br':
                b.w = Math.max(minSize, imgPos.x - orig.x);
                b.h = Math.max(minSize, imgPos.y - orig.y);
                break;
            case 'b':
                b.h = Math.max(minSize, imgPos.y - orig.y);
                break;
            case 'bl':
                b.x = Math.min(imgPos.x, orig.x + orig.w - minSize);
                b.w = orig.x + orig.w - b.x;
                b.h = Math.max(minSize, imgPos.y - orig.y);
                break;
            case 'l':
                b.x = Math.min(imgPos.x, orig.x + orig.w - minSize);
                b.w = orig.x + orig.w - b.x;
                break;
        }

        // Clamp to image bounds
        b.x = Math.max(0, b.x);
        b.y = Math.max(0, b.y);
        b.w = Math.min(b.w, this.imgWidth - b.x);
        b.h = Math.min(b.h, this.imgHeight - b.y);
    },

    _updateCursor(canvasPos) {
        if (this.isDrawing) {
            this.canvas.style.cursor = 'crosshair';
            return;
        }

        // Check handles on selected box
        if (this.selectedBoxIndex >= 0) {
            const handle = this._getHandleAt(canvasPos.x, canvasPos.y, this.selectedBoxIndex);
            if (handle) {
                const handles = this._getHandlePositions(this.selectedBoxIndex);
                const h = handles.find(hh => hh.id === handle);
                this.canvas.style.cursor = h ? h.cursor : 'pointer';
                return;
            }

            // Check if inside selected box (move cursor)
            const imgPos = this.canvasToImage(canvasPos.x, canvasPos.y);
            const b = this.boxes[this.selectedBoxIndex];
            if (imgPos.x >= b.x && imgPos.x <= b.x + b.w && imgPos.y >= b.y && imgPos.y <= b.y + b.h) {
                this.canvas.style.cursor = 'move';
                return;
            }
        }

        this.canvas.style.cursor = 'crosshair';
    },

    _findBoxAt(ix, iy) {
        // Find smallest box containing point (for nested boxes)
        let best = -1;
        let bestArea = Infinity;
        for (let i = 0; i < this.boxes.length; i++) {
            const b = this.boxes[i];
            if (ix >= b.x && ix <= b.x + b.w && iy >= b.y && iy <= b.y + b.h) {
                const area = b.w * b.h;
                if (area < bestArea) {
                    bestArea = area;
                    best = i;
                }
            }
        }
        return best;
    },

    // ---- Rendering ----
    render() {
        const ctx = this.ctx;
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, cw, ch);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, cw, ch);

        if (!this.image) return;

        // Draw image
        ctx.drawImage(
            this.image,
            this.offsetX, this.offsetY,
            this.imgWidth * this.scale, this.imgHeight * this.scale
        );

        // Draw existing boxes
        for (let i = 0; i < this.boxes.length; i++) {
            this._drawBox(this.boxes[i], i === this.selectedBoxIndex);
        }

        // Draw current box being drawn
        if (this.isDrawing && this.drawStart && this.mousePos) {
            const start = this.imageToCanvas(this.drawStart.x, this.drawStart.y);
            const color = AppState && AppState.activeClass ? AppState.activeClass.color : '#FF3838';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(
                start.x, start.y,
                this.mousePos.x - start.x, this.mousePos.y - start.y
            );
            ctx.setLineDash([]);
        }

        // Draw crosshair
        if (this.mousePos) {
            this._drawCrosshair(this.mousePos.x, this.mousePos.y);
        }
    },

    _drawBox(box, isSelected) {
        const ctx = this.ctx;
        const color = this._getBoxColor(box);
        const tl = this.imageToCanvas(box.x, box.y);
        const br = this.imageToCanvas(box.x + box.w, box.y + box.h);
        const w = br.x - tl.x;
        const h = br.y - tl.y;

        // Box outline
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeRect(tl.x, tl.y, w, h);

        // Semi-transparent fill
        ctx.fillStyle = color + '20';
        ctx.fillRect(tl.x, tl.y, w, h);

        // Label background
        const label = `${box.class_name} (id: ${box.class_id})`;
        ctx.font = 'bold 11px sans-serif';
        const textMetrics = ctx.measureText(label);
        const labelW = textMetrics.width + 8;
        const labelH = 18;

        ctx.fillStyle = color;
        ctx.fillRect(tl.x, tl.y - labelH, labelW, labelH);

        // Label text
        ctx.fillStyle = '#fff';
        ctx.fillText(label, tl.x + 4, tl.y - 5);

        // Selection markers (resize handles)
        if (isSelected) {
            const hs = this.HANDLE_SIZE;
            const tl = this.imageToCanvas(box.x, box.y);
            const br = this.imageToCanvas(box.x + box.w, box.y + box.h);
            const mx = (tl.x + br.x) / 2;
            const my = (tl.y + br.y) / 2;

            const handlePositions = [
                [tl.x, tl.y], [mx, tl.y], [br.x, tl.y],
                [br.x, my],
                [br.x, br.y], [mx, br.y], [tl.x, br.y],
                [tl.x, my],
            ];

            for (const [hx, hy] of handlePositions) {
                ctx.fillStyle = '#fff';
                ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(hx - hs / 2, hy - hs / 2, hs, hs);
            }
        }
    },

    _drawCrosshair(cx, cy) {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Horizontal
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(this.canvas.width, cy);
        ctx.stroke();

        // Vertical
        ctx.beginPath();
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, this.canvas.height);
        ctx.stroke();

        ctx.setLineDash([]);
    },

    _getBoxColor(box) {
        if (typeof AppState !== 'undefined' && AppState.project && AppState.project.colors) {
            const idx = AppState.project.classes.indexOf(box.class_name);
            if (idx >= 0 && AppState.project.colors[idx]) {
                return AppState.project.colors[idx];
            }
        }
        const defaultColors = [
            '#FF3838', '#FF9D97', '#FF701F', '#FFB21D', '#CFD231',
            '#48F90A', '#92CC17', '#3DDB86', '#1A9334', '#00D4BB',
        ];
        return defaultColors[box.class_id % defaultColors.length];
    },
};
