/**
 * Sidebar module — class management, stats, export.
 */
const Sidebar = {
    init() {
        document.getElementById('btn-add-class').addEventListener('click', () => this.addClass());
        document.getElementById('new-class-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.addClass();
        });
        document.getElementById('btn-export').addEventListener('click', () => this.exportDataset());
    },

    renderClasses(classes, colors, activeClassId, classCounts) {
        const container = document.getElementById('classes-list');
        container.innerHTML = classes.map((cls, i) => {
            const count = classCounts[cls] || 0;
            const isActive = i === activeClassId;
            return `
                <div class="class-item ${isActive ? 'active' : ''}" data-class-id="${i}" onclick="AppState.setActiveClass(${i})">
                    <div class="class-color-dot" style="background:${colors[i] || '#888'}"></div>
                    <span class="class-name">${cls}</span>
                    <span class="class-count">(${count})</span>
                    <span class="class-shortcut">${i + 1 <= 9 ? i + 1 : ''}</span>
                    <button class="class-remove" onclick="event.stopPropagation(); Sidebar.removeClass('${cls}')" title="Remover classe">✕</button>
                </div>
            `;
        }).join('');
    },

    async addClass() {
        const input = document.getElementById('new-class-input');
        const name = input.value.trim();
        if (!name) return;

        await API.addClass(AppState.projectName, name);
        input.value = '';
        await AppState.refreshProject();
    },

    async removeClass(className) {
        if (!confirm(`Remover classe "${className}"?`)) return;
        await API.removeClass(AppState.projectName, className);
        await AppState.refreshProject();
    },

    updateStats(stats) {
        document.getElementById('stat-total').textContent = stats.total_frames || 0;
        document.getElementById('stat-annotated').textContent = stats.annotated_frames || 0;
        document.getElementById('stat-skipped').textContent = stats.skipped_frames || 0;
        document.getElementById('stat-boxes').textContent = stats.total_boxes || 0;
    },

    async exportDataset() {
        const trainVal = parseInt(document.getElementById('split-train').value) || 80;
        const valVal = parseInt(document.getElementById('split-val').value) || 15;
        const testVal = parseInt(document.getElementById('split-test').value) || 5;
        const imgSize = parseInt(document.getElementById('export-imgsize').value) || null;

        const total = trainVal + valVal + testVal;
        if (total !== 100) {
            alert(`Os splits devem somar 100%. Atual: ${total}%`);
            return;
        }

        const btn = document.getElementById('btn-export');
        btn.textContent = 'Exportando...';
        btn.disabled = true;

        try {
            const result = await API.exportDataset(
                AppState.projectName,
                trainVal / 100,
                valVal / 100,
                testVal / 100,
                imgSize
            );

            const resultDiv = document.getElementById('export-result');
            resultDiv.innerHTML = `
                <p><strong>Train:</strong> ${result.train} imagens</p>
                <p><strong>Val:</strong> ${result.val} imagens</p>
                <p><strong>Test:</strong> ${result.test} imagens</p>
                <p><strong>Total Labels:</strong> ${result.total_labels}</p>
                <p><strong>Caminho:</strong> <code>${result.export_path}</code></p>
            `;
            document.getElementById('export-modal').style.display = 'flex';
        } catch (err) {
            alert('Erro ao exportar: ' + err.message);
        } finally {
            btn.textContent = 'Exportar YOLO';
            btn.disabled = false;
        }
    },


};
