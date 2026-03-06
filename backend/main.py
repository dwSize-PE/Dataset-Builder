"""FastAPI main application."""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

from .config import DATA_DIR
from .routers import projects, media, annotations, export

app = FastAPI(title="YOLO Dataset Builder", version="1.0.0")

# Include routers
app.include_router(projects.router)
app.include_router(media.router)
app.include_router(annotations.router)
app.include_router(export.router)

# Serve frontend static files
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# Serve project frames and thumbnails
@app.get("/api/frames/{project_name}/{filename}")
async def serve_frame(project_name: str, filename: str):
    """Serve a frame image."""
    path = DATA_DIR / project_name / "frames" / filename
    if not path.exists():
        return {"error": "not found"}
    return FileResponse(path)


@app.get("/api/thumbnails/{project_name}/{filename}")
async def serve_thumbnail(project_name: str, filename: str):
    """Serve a thumbnail image."""
    path = DATA_DIR / project_name / "thumbnails" / filename
    if not path.exists():
        # Fallback to full frame
        path = DATA_DIR / project_name / "frames" / filename
    if not path.exists():
        return {"error": "not found"}
    return FileResponse(path)


# SPA: serve index.html for all non-API routes
@app.get("/")
async def root():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/annotate/{project_name}")
async def annotate_page(project_name: str):
    return FileResponse(str(FRONTEND_DIR / "annotator.html"))
