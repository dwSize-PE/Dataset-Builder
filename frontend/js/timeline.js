/**
 * Timeline module — bottom frame preview strip with multi-selection.
 *
 * Selection behavior (Windows-like):
 *   Click        → navigate to frame (single select)
 *   Ctrl+Click   → toggle individual frame in selection
 *   Shift+Click  → select range from last anchor to clicked
 */
const Timeline = {
    container: null,
    frames: [],
    annotationStatus: {},
    currentIndex: 0,

    // Multi-selection
    selectedIndices: new Set(),  // indices of selected frames
    anchorIndex: -1,             // anchor for shift-range select

    init() {
        this.container = document.getElementById('timeline-scroll');
        // Event delegation — more reliable for Ctrl/Shift than inline onclick
        this.container.addEventListener('mousedown', (e) => {
            const thumb = e.target.closest('.timeline-thumb');
            if (!thumb) return;
            e.preventDefault();  // prevent text selection / browser Ctrl+Click behavior
            const index = parseInt(thumb.dataset.index, 10);
            if (!isNaN(index)) this.handleClick(index, e);
        });
    },

    setFrames(frames) {
        this.frames = frames;
        this.selectedIndices.clear();
        this.anchorIndex = -1;
        this.render();
    },

    setAnnotationStatus(status) {
        this.annotationStatus = status;
        this.render();
    },

    updateSingleStatus(filename, hasBoxes, skipped) {
        this.annotationStatus[filename] = { has_boxes: hasBoxes, skipped };
        this._updateThumbClass(filename);
    },

    setCurrentIndex(index) {
        this.currentIndex = index;
        this._updateActiveThumb();
        this._scrollToActive();
    },

    // ---- Selection API ----
    getSelectedFilenames() {
        return [...this.selectedIndices].sort((a, b) => a - b).map(i => this.frames[i]);
    },

    getSelectedCount() {
        return this.selectedIndices.size;
    },

    clearSelection() {
        this.selectedIndices.clear();
        this.anchorIndex = -1;
        this._updateSelectionVisuals();
        this._updateBulkBar();
    },

    handleClick(index, event) {
        if (event.ctrlKey || event.metaKey) {
            // Ctrl+Click: toggle individual
            if (this.selectedIndices.has(index)) {
                this.selectedIndices.delete(index);
            } else {
                this.selectedIndices.add(index);
            }
            this.anchorIndex = index;
            this._updateSelectionVisuals();
            this._updateBulkBar();
        } else if (event.shiftKey && this.anchorIndex >= 0) {
            // Shift+Click: range select
            const start = Math.min(this.anchorIndex, index);
            const end = Math.max(this.anchorIndex, index);
            for (let i = start; i <= end; i++) {
                this.selectedIndices.add(i);
            }
            this._updateSelectionVisuals();
            this._updateBulkBar();
        } else {
            // Normal click: navigate + clear selection
            this.selectedIndices.clear();
            this.anchorIndex = index;
            this._updateSelectionVisuals();
            this._updateBulkBar();
            AppState.goToFrame(index);
        }
    },

    // ---- Rendering ----
    render() {
        if (this.frames.length === 0) {
            this.container.innerHTML = '';
            this._updateProgress();
            this._updateBulkBar();
            return;
        }

        this.container.innerHTML = this.frames.map((filename, i) => {
            const thumbUrl = API.thumbnailUrl(AppState.projectName, filename);
            const status = this.annotationStatus[filename];
            let statusClass = '';
            if (status) {
                if (status.skipped) statusClass = 'skipped';
                else if (status.has_boxes) statusClass = 'annotated';
            }
            const activeClass = i === this.currentIndex ? 'active' : '';
            const selectedClass = this.selectedIndices.has(i) ? 'multi-selected' : '';
            const label = filename.replace('frame_', '').replace('.jpg', '');

            return `
                <div class="timeline-thumb ${statusClass} ${activeClass} ${selectedClass}"
                     data-index="${i}"
                     data-filename="${filename}"
                     title="${filename}">
                    <img src="${thumbUrl}" loading="lazy" draggable="false" alt="${filename}">
                    <div class="thumb-label">${label}</div>
                </div>
            `;
        }).join('');

        this._updateProgress();
        this._updateBulkBar();
    },

    _updateActiveThumb() {
        const thumbs = this.container.querySelectorAll('.timeline-thumb');
        thumbs.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === this.currentIndex);
        });
    },

    _updateSelectionVisuals() {
        const thumbs = this.container.querySelectorAll('.timeline-thumb');
        thumbs.forEach((thumb, i) => {
            thumb.classList.toggle('multi-selected', this.selectedIndices.has(i));
        });
    },

    _updateThumbClass(filename) {
        const thumb = this.container.querySelector(`[data-filename="${filename}"]`);
        if (!thumb) return;

        const status = this.annotationStatus[filename];
        thumb.classList.remove('annotated', 'skipped');
        if (status) {
            if (status.skipped) thumb.classList.add('skipped');
            else if (status.has_boxes) thumb.classList.add('annotated');
        }

        this._updateProgress();
    },

    _scrollToActive() {
        const thumb = this.container.querySelector('.timeline-thumb.active');
        if (thumb) {
            thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    },

    _updateProgress() {
        const total = this.frames.length;
        let annotated = 0;
        for (const fn of this.frames) {
            const s = this.annotationStatus[fn];
            if (s && (s.has_boxes || s.skipped)) annotated++;
        }
        document.getElementById('timeline-progress').textContent = `${annotated} / ${total} processados`;
    },

    _updateBulkBar() {
        const bar = document.getElementById('bulk-actions-bar');
        if (!bar) return;
        const count = this.selectedIndices.size;
        if (count > 0) {
            bar.style.display = 'flex';
            document.getElementById('bulk-count').textContent = `${count} frame(s) selecionado(s)`;
        } else {
            bar.style.display = 'none';
        }
    },
};
