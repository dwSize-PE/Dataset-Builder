/**
 * API client — all backend communication in one place.
 */
const API = {
    // ---- Projects ----
    async getProjects() {
        const res = await fetch('/api/projects');
        return res.json();
    },

    async createProject(name, classes) {
        const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, classes }),
        });
        return res.json();
    },

    async getProject(name) {
        const res = await fetch(`/api/projects/${encodeURIComponent(name)}`);
        return res.json();
    },

    async deleteProject(name) {
        const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, { method: 'DELETE' });
        return res.json();
    },

    async addClass(projectName, className) {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: className }),
        });
        return res.json();
    },

    async removeClass(projectName, className) {
        const res = await fetch(
            `/api/projects/${encodeURIComponent(projectName)}/classes/${encodeURIComponent(className)}`,
            { method: 'DELETE' }
        );
        return res.json();
    },

    // ---- Media ----
    async uploadMedia(projectName, files, frameInterval = 30) {
        const formData = new FormData();
        for (const file of files) {
            formData.append('files', file);
        }
        formData.append('frame_interval', frameInterval);

        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/media/upload`, {
            method: 'POST',
            body: formData,
        });
        return res.json();
    },

    async getFrames(projectName) {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/media/frames`);
        return res.json();
    },

    async deleteFrame(projectName, filename) {
        const res = await fetch(
            `/api/projects/${encodeURIComponent(projectName)}/media/frames/${encodeURIComponent(filename)}`,
            { method: 'DELETE' }
        );
        return res.json();
    },

    // ---- Annotations ----
    async saveAnnotation(projectName, annotation) {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/annotations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(annotation),
        });
        return res.json();
    },

    async getAnnotation(projectName, frameFilename) {
        const res = await fetch(
            `/api/projects/${encodeURIComponent(projectName)}/annotations/${encodeURIComponent(frameFilename)}`
        );
        return res.json();
    },

    async getAllAnnotations(projectName) {
        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/annotations`);
        return res.json();
    },

    // ---- Export ----
    async exportDataset(projectName, trainRatio, valRatio, testRatio, imgSize) {
        const body = {
            train_ratio: trainRatio,
            val_ratio: valRatio,
            test_ratio: testRatio,
        };
        if (imgSize) body.img_size = imgSize;

        const res = await fetch(`/api/projects/${encodeURIComponent(projectName)}/export`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return res.json();
    },

    // ---- URLs ----
    frameUrl(projectName, filename) {
        return `/api/frames/${encodeURIComponent(projectName)}/${encodeURIComponent(filename)}`;
    },

    thumbnailUrl(projectName, filename) {
        return `/api/thumbnails/${encodeURIComponent(projectName)}/${encodeURIComponent(filename)}`;
    },
};
