/**
 * Main application — state management and orchestration.
 */
const AppState = {
    projectName: '',
    project: null,       // { name, classes, colors, ... }
    frames: [],          // ['frame_000000.jpg', ...]
    currentFrameIndex: -1,
    activeClass: null,   // { id, name, color }
    annotationStatus: {},

    async init() {
        // Extract project name from URL: /annotate/{name}
        const parts = window.location.pathname.split('/');
        this.projectName = decodeURIComponent(parts[parts.length - 1]);

        document.getElementById('project-name-label').textContent = this.projectName;

        // Init modules
        CanvasManager.init('annotation-canvas', 'canvas-wrapper');
        Timeline.init();
        Sidebar.init();
        Shortcuts.init();



        // Setup upload
        this._setupUpload();
        this._setupDragDrop();
        this._setupToolbar();


        // Load project data
        await this.refreshProject();
        await this.loadFrames();

        // Load annotation status
        this.annotationStatus = await API.getAllAnnotations(this.projectName);
        Timeline.setAnnotationStatus(this.annotationStatus);

        // Show first frame
        if (this.frames.length > 0) {
            this.goToFrame(0);
            document.getElementById('no-frames-msg').style.display = 'none';
        }
    },

    async refreshProject() {
        this.project = await API.getProject(this.projectName);

        // Set default active class
        if (this.project.classes.length > 0 && !this.activeClass) {
            this.setActiveClass(0);
        }

        // Update sidebar
        const classCounts = this.project.class_counts || {};
        Sidebar.renderClasses(
            this.project.classes,
            this.project.colors || [],
            this.activeClass ? this.activeClass.id : 0,
            classCounts
        );
        Sidebar.updateStats(this.project);
    },

    async loadFrames() {
        this.frames = await API.getFrames(this.projectName);
        Timeline.setFrames(this.frames);
        this._updateFrameCounter();
    },

    setActiveClass(index) {
        if (!this.project || index < 0 || index >= this.project.classes.length) return;
        this.activeClass = {
            id: index,
            name: this.project.classes[index],
            color: this.project.colors[index] || '#FF3838',
        };
        Sidebar.renderClasses(
            this.project.classes,
            this.project.colors || [],
            index,
            this.project.class_counts || {}
        );
    },

    async goToFrame(index) {
        if (index < 0 || index >= this.frames.length) return;

        // Auto-save current frame
        if (this.currentFrameIndex >= 0) {
            await this._autoSave();
        }

        this.currentFrameIndex = index;
        const filename = this.frames[index];

        // Load image on canvas
        const url = API.frameUrl(this.projectName, filename);
        await CanvasManager.loadImage(url);

        // Load existing annotation
        const ann = await API.getAnnotation(this.projectName, filename);
        CanvasManager.setBoxes(ann.boxes || []);

        // Update UI
        Timeline.setCurrentIndex(index);
        this._updateFrameCounter();

        document.getElementById('no-frames-msg').style.display = 'none';
    },

    getNavSkip() {
        const sel = document.getElementById('nav-skip-select');
        return sel ? parseInt(sel.value, 10) || 1 : 1;
    },

    async nextFrame() {
        const skip = this.getNavSkip();
        const target = Math.min(this.currentFrameIndex + skip, this.frames.length - 1);
        if (target !== this.currentFrameIndex && target >= 0) {
            await this.goToFrame(target);
        }
    },

    async prevFrame() {
        const skip = this.getNavSkip();
        const target = Math.max(this.currentFrameIndex - skip, 0);
        if (target !== this.currentFrameIndex) {
            await this.goToFrame(target);
        }
    },

    async skipFrame() {
        if (this.currentFrameIndex < 0) return;
        const filename = this.frames[this.currentFrameIndex];

        // Save as skipped
        await API.saveAnnotation(this.projectName, {
            frame_filename: filename,
            boxes: [],
            skipped: true,
        });

        this.annotationStatus[filename] = { has_boxes: false, skipped: true, box_count: 0 };
        Timeline.updateSingleStatus(filename, false, true);

        // Move to next
        await this.nextFrame();
        await this.refreshProject();
    },

    async saveCurrentAnnotation() {
        await this._autoSave();
        await this.refreshProject();
    },

    async _autoSave() {
        if (this.currentFrameIndex < 0) return;
        const filename = this.frames[this.currentFrameIndex];
        const boxes = CanvasManager.getBoxes();

        await API.saveAnnotation(this.projectName, {
            frame_filename: filename,
            boxes: boxes,
            skipped: false,
        });

        const hasBoxes = boxes.length > 0;
        this.annotationStatus[filename] = { has_boxes: hasBoxes, skipped: false, box_count: boxes.length };
        Timeline.updateSingleStatus(filename, hasBoxes, false);
    },

    _updateFrameCounter() {
        const counter = document.getElementById('frame-counter');
        if (this.frames.length === 0) {
            counter.textContent = 'Nenhum frame';
        } else {
            counter.textContent = `Frame ${this.currentFrameIndex + 1} de ${this.frames.length}`;
        }
    },

    // ---- Upload ----
    _setupUpload() {
        const fileInput = document.getElementById('file-input');
        const btnUpload = document.getElementById('btn-upload');

        btnUpload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            if (fileInput.files.length > 0) {
                await this._uploadFiles(fileInput.files);
                fileInput.value = '';
            }
        });
    },

    _setupDragDrop() {
        const wrapper = document.getElementById('canvas-wrapper');
        const overlay = document.getElementById('drop-overlay');

        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            overlay.classList.add('active');
        });

        wrapper.addEventListener('dragleave', (e) => {
            e.preventDefault();
            overlay.classList.remove('active');
        });

        wrapper.addEventListener('drop', async (e) => {
            e.preventDefault();
            overlay.classList.remove('active');
            if (e.dataTransfer.files.length > 0) {
                await this._uploadFiles(e.dataTransfer.files);
            }
        });
    },

    async _uploadFiles(fileList) {
        await this._doUpload(fileList, 30);
    },

    async _doUpload(fileList, frameInterval) {
        const uploadOverlay = document.getElementById('upload-overlay');
        const progressFill = document.getElementById('upload-progress-fill');
        const statusText = document.getElementById('upload-status');

        uploadOverlay.style.display = 'flex';
        progressFill.style.width = '30%';
        statusText.textContent = `Enviando ${fileList.length} arquivo(s)...`;

        try {
            progressFill.style.width = '60%';
            const result = await API.uploadMedia(this.projectName, fileList, frameInterval);

            progressFill.style.width = '90%';
            statusText.textContent = `Processando ${result.total_frames_added} frames...`;

            // Reload frames
            await this.loadFrames();
            this.annotationStatus = await API.getAllAnnotations(this.projectName);
            Timeline.setAnnotationStatus(this.annotationStatus);

            // Go to first frame if none loaded
            if (this.currentFrameIndex < 0 && this.frames.length > 0) {
                await this.goToFrame(0);
            }

            document.getElementById('no-frames-msg').style.display = 'none';

            progressFill.style.width = '100%';
            statusText.textContent = `✓ ${result.total_frames_added} frames adicionados!`;

            await this.refreshProject();

            setTimeout(() => {
                uploadOverlay.style.display = 'none';
                progressFill.style.width = '0%';
            }, 1200);
        } catch (err) {
            statusText.textContent = 'Erro no upload: ' + err.message;
            setTimeout(() => {
                uploadOverlay.style.display = 'none';
            }, 3000);
        }
    },

    // ---- Toolbar ----
    _setupToolbar() {
        document.getElementById('btn-save').addEventListener('click', () => this.saveCurrentAnnotation());
        document.getElementById('btn-skip').addEventListener('click', () => this.skipFrame());
        document.getElementById('btn-undo').addEventListener('click', () => CanvasManager.undo());
        document.getElementById('btn-clear').addEventListener('click', () => CanvasManager.clearBoxes());
        document.getElementById('btn-delete-frame').addEventListener('click', () => this.deleteCurrentFrame());
    },

    async deleteCurrentFrame() {
        if (this.currentFrameIndex < 0) return;
        const filename = this.frames[this.currentFrameIndex];
        if (!confirm(`Excluir frame "${filename}" permanentemente?`)) return;

        await API.deleteFrame(this.projectName, filename);
        await this.loadFrames();
        this.annotationStatus = await API.getAllAnnotations(this.projectName);
        Timeline.setAnnotationStatus(this.annotationStatus);

        // Go to next frame or previous
        if (this.frames.length === 0) {
            this.currentFrameIndex = -1;
            CanvasManager.image = null;
            CanvasManager.setBoxes([]);
            CanvasManager.render();
            document.getElementById('no-frames-msg').style.display = 'block';
        } else {
            const newIdx = Math.min(this.currentFrameIndex, this.frames.length - 1);
            this.currentFrameIndex = -1; // force reload
            await this.goToFrame(newIdx);
        }
        await this.refreshProject();
    },

    // ---- Bulk Actions ----
    async bulkDeleteFrames() {
        const filenames = Timeline.getSelectedFilenames();
        if (filenames.length === 0) return;
        if (!confirm(`Excluir ${filenames.length} frame(s) permanentemente?`)) return;

        for (const fn of filenames) {
            await API.deleteFrame(this.projectName, fn);
        }

        Timeline.clearSelection();
        await this.loadFrames();
        this.annotationStatus = await API.getAllAnnotations(this.projectName);
        Timeline.setAnnotationStatus(this.annotationStatus);

        if (this.frames.length === 0) {
            this.currentFrameIndex = -1;
            CanvasManager.image = null;
            CanvasManager.setBoxes([]);
            CanvasManager.render();
            document.getElementById('no-frames-msg').style.display = 'block';
        } else {
            const newIdx = Math.min(this.currentFrameIndex, this.frames.length - 1);
            this.currentFrameIndex = -1;
            await this.goToFrame(Math.max(0, newIdx));
        }
        await this.refreshProject();
    },

    async bulkSkipFrames() {
        const filenames = Timeline.getSelectedFilenames();
        if (filenames.length === 0) return;
        if (!confirm(`Marcar ${filenames.length} frame(s) como pulado(s)?`)) return;

        for (const fn of filenames) {
            await API.saveAnnotation(this.projectName, {
                frame_filename: fn,
                boxes: [],
                skipped: true,
            });
            this.annotationStatus[fn] = { has_boxes: false, skipped: true, box_count: 0 };
        }

        Timeline.clearSelection();
        Timeline.setAnnotationStatus(this.annotationStatus);
        await this.refreshProject();
    },
};

// Boot
document.addEventListener('DOMContentLoaded', () => AppState.init());
