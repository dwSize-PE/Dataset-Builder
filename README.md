# ⬡ YOLO Dataset Builder

<p align="center">
  <strong>Local web tool for creating training datasets in YOLO format</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/OpenCV-4.10-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white" alt="OpenCV">
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License">
</p>

---

## 📋 About the Project

**YOLO Dataset Builder** is a local web application designed to prepare image and video datasets for training **YOLOv8/v11** models. The tool allows you to import media, annotate objects with bounding boxes, manage classes, and export everything in YOLO format ready for training.

### Why use it?

- **No external service dependencies** — everything runs locally on your machine
- **Scalable across multiple projects** — person detection, vehicles, animals, etc.
- **Direct YOLO export** — automatically generates `data.yaml` + `train/val/test` structure
- **Only annotated frames are exported** — loaded 100 frames but annotated 50? The dataset will contain exactly those 50 annotated frames

---

<img width="1907" height="912" alt="image" src="https://github.com/user-attachments/assets/9b615713-f571-45e9-a7fc-ff8e07de9905" />

## ✨ Features

| Feature | Description |
|---|---|
| **Image and video upload** | Supports JPG, PNG, BMP, WebP, MP4, AVI, MKV, MOV, WebM |
| **Frame extraction** | Automatically extracts frames when uploading videos |
| **Bounding box annotation** | Draw boxes around objects directly on the canvas |
| **Multi-class** | Support for multiple classes per image with distinct colors |
| **Resize and drag bboxes** | 8 resize handles + drag to reposition |
| **Crosshair** | Cross-shaped visual guide for precise annotation |
| **Undo (Ctrl+Z)** | Undo up to 50 canvas actions |
| **Frame skipping** | Mark bad frames that should not be included in the dataset |
| **Frame deletion** | Delete unwanted frames (individually or in bulk) |
| **Multi-selection in timeline** | Ctrl+Click (individual) and Shift+Click (range) for bulk actions |
| **YOLO export** | Configurable Train/Val/Test split with optional resize |
| **Skip navigation** | Configurable dropdown to jump N frames at a time (1, 5, 10, 15, 20, 30, 50) |
| **Keyboard shortcuts** | Fast navigation and annotation without lifting your hands from the keyboard |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `D` / `→` | Advance N frames (configurable) |
| `A` / `←` | Go back N frames (configurable) |
| `X` | Skip frame (mark as bad) |
| `B` | Box mode (bounding box) |
| `1-9` | Select class by number |
| `Del` | Remove selected bbox |
| `Shift+Del` | Delete current frame |
| `Ctrl+Z` | Undo last action |
| `Ctrl+S` | Save current annotation |
| `Esc` | Cancel drawing / deselect |
| `H` | Show/hide shortcuts panel |

---

## 🏗️ Architecture

```
dataset-builder/
├── run.py                          # Entry point (uvicorn)
├── requirements.txt                # Python dependencies
├── README.md
│
├── backend/
│   ├── main.py                     # FastAPI app + static routes
│   ├── config.py                   # Constants and settings
│   ├── models/
│   │   └── schemas.py              # Pydantic models (validation)
│   ├── routers/
│   │   ├── projects.py             # Project CRUD
│   │   ├── media.py                # Media upload + frame listing
│   │   ├── annotations.py          # Save/load annotations
│   │   └── export.py               # YOLO export
│   └── services/
│       ├── video_processor.py      # Frame extraction with OpenCV
│       ├── image_processor.py      # Image import and resize
│       ├── annotation_manager.py   # Annotation management (JSON)
│       └── dataset_exporter.py     # Conversion to YOLO format
│
├── frontend/
│   ├── index.html                  # Dashboard (create/list projects)
│   ├── annotator.html              # Annotation interface
│   ├── css/
│   │   └── style.css               # Full dark theme
│   └── js/
│       ├── api.js                  # HTTP calls to backend
│       ├── app.js                  # Global state and orchestration
│       ├── canvas.js               # Annotation canvas (drawing, resize, drag)
│       ├── sidebar.js              # Classes, statistics, export
│       ├── timeline.js             # Frame timeline with multi-selection
│       └── shortcuts.js            # Keyboard shortcuts
│
├── data/                           # Project data (auto-created)
│   └── {project}/
│       ├── frames/                 # Extracted images/frames
│       ├── thumbnails/             # Thumbnails for timeline
│       └── annotations/            # Annotations in JSON
│
└── exports/                        # Exported datasets (auto-created)
    └── {project}/
        ├── data.yaml               # YOLO dataset config
        ├── train/
        │   ├── images/
        │   └── labels/
        ├── val/
        │   ├── images/
        │   └── labels/
        └── test/
            ├── images/
            └── labels/
```

---

## 🛠️ Technologies

| Technology | Version | Usage |
|---|---|---|
| **Python** | 3.11+ | Main backend language |
| **FastAPI** | 0.115 | Asynchronous web framework (REST API) |
| **Uvicorn** | 0.30 | ASGI server |
| **OpenCV** | 4.10 (headless) | Video frame extraction |
| **Pillow** | 10.4 | Image processing and thumbnails |
| **PyYAML** | 6.0 | `data.yaml` generation for YOLO |
| **HTML5 Canvas** | — | Annotation rendering in the browser |
| **Vanilla JS** | ES6+ | Modular frontend without frameworks |

---

## 🚀 How to Run

### Prerequisites

- **Python 3.11+** installed (recommended via [pyenv](https://github.com/pyenv/pyenv))
- **pip** (Python package manager)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/yolo-dataset-builder.git
cd yolo-dataset-builder

# 2. (Optional) Create a virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# 3. Install dependencies
pip install -r requirements.txt
```

### Running

```bash
python run.py
```

The server starts at **http://localhost:8000** — open it in your browser.

### Server Management

```bash
# Stop the server
fuser -k 8000/tcp

# Restart
fuser -k 8000/tcp; sleep 1; python run.py
```

---

## 📖 How to Use

### 1. Create a Project

On the home screen, enter the **project name** and the detection **classes** (e.g., `fallen_person`, `standing_person`). Click **Create Project**.

### 2. Upload Media

In the annotator, click **📁 Upload** or drag files onto the screen:
- **Images**: imported directly as frames
- **Videos**: opens a modal to configure the frame extraction interval (e.g., 1 frame every 30 = ~1 fps for a 30fps video)

### 3. Annotate Frames

1. Select the desired **class** in the sidebar (or press `1-9`)
2. Draw a **bounding box** around the object on the canvas
3. Use the **handles** to adjust size and position
4. Navigate between frames with `D`/`A` or `→`/`←` (saves automatically)
5. Mark bad frames with `X` (skip)

### 4. Multi-Selection and Bulk Actions

In the timeline (bottom section):
- **Ctrl+Click** — select/deselect frames individually
- **Shift+Click** — select a range of frames
- Use the **Delete selected** or **Skip selected** buttons in the action bar

### 5. Export Dataset

In the sidebar, configure the **Train/Val/Test** split (default: 80/15/5) and optionally the image **resize**. Click **Export YOLO**.

> ⚠️ **Only frames with saved annotations are exported.** Frames without bboxes or marked as "skipped" are ignored.

The dataset is generated in `exports/{project}/` with the standard YOLO structure, ready to use with:

```python
from ultralytics import YOLO

model = YOLO("yolo11n.pt")
model.train(data="exports/my_project/data.yaml", epochs=100, imgsz=640)
```

### YOLO Label Format

Each `.txt` label file contains one line per object:

```
class_id x_center y_center width height
```

All values are **normalized between 0 and 1** relative to the image dimensions.

---

## 📂 `data.yaml` Format

```yaml
path: /absolute/path/exports/my_project
train: train/images
val: val/images
test: test/images
names:
  0: fallen_person
  1: standing_person
```

---

## 🤝 Contributing

1. Fork the project
2. Create a branch for your feature (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'feat: my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

## 👨‍💻 Developed by

**Leonardo de Souza Melo** — [@dwSize-PE](https://github.com/dwSize-PE)
