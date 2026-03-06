"""Project management routes."""
import json
from pathlib import Path
from fastapi import APIRouter, HTTPException

from ..config import DATA_DIR, CLASS_COLORS
from ..models.schemas import ProjectCreate, ProjectInfo, ClassAdd
from ..services.annotation_manager import get_annotation_stats

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _get_project_dir(name: str) -> Path:
    return DATA_DIR / name


def _load_project_meta(project_dir: Path) -> dict:
    meta_path = project_dir / "project.json"
    if not meta_path.exists():
        raise HTTPException(404, "Project not found")
    with open(meta_path) as f:
        return json.load(f)


def _save_project_meta(project_dir: Path, meta: dict):
    with open(project_dir / "project.json", "w") as f:
        json.dump(meta, f, indent=2)


@router.get("")
def list_projects():
    """List all projects."""
    projects = []
    if not DATA_DIR.exists():
        return []
    for d in sorted(DATA_DIR.iterdir()):
        meta_path = d / "project.json"
        if d.is_dir() and meta_path.exists():
            with open(meta_path) as f:
                meta = json.load(f)
            projects.append({"name": meta["name"], "classes": meta["classes"]})
    return projects


@router.post("")
def create_project(data: ProjectCreate):
    """Create a new project."""
    project_dir = _get_project_dir(data.name)
    if project_dir.exists():
        raise HTTPException(400, "Project already exists")

    project_dir.mkdir(parents=True)
    (project_dir / "frames").mkdir()
    (project_dir / "thumbnails").mkdir()
    (project_dir / "annotations").mkdir()
    (project_dir / "raw").mkdir()

    meta = {
        "name": data.name,
        "classes": data.classes,
    }
    _save_project_meta(project_dir, meta)

    return {"status": "created", "name": data.name}


@router.get("/{name}")
def get_project(name: str):
    """Get project details with stats."""
    project_dir = _get_project_dir(name)
    meta = _load_project_meta(project_dir)
    stats = get_annotation_stats(project_dir, meta["classes"])

    return {
        **meta,
        **stats,
        "colors": CLASS_COLORS[: len(meta["classes"])],
    }


@router.delete("/{name}")
def delete_project(name: str):
    """Delete a project and all its data."""
    import shutil
    project_dir = _get_project_dir(name)
    if not project_dir.exists():
        raise HTTPException(404, "Project not found")
    shutil.rmtree(project_dir)
    return {"status": "deleted"}


@router.post("/{name}/classes")
def add_class(name: str, data: ClassAdd):
    """Add a class to a project."""
    project_dir = _get_project_dir(name)
    meta = _load_project_meta(project_dir)

    if data.name in meta["classes"]:
        raise HTTPException(400, "Class already exists")

    meta["classes"].append(data.name)
    _save_project_meta(project_dir, meta)

    return {"classes": meta["classes"]}


@router.delete("/{name}/classes/{class_name}")
def remove_class(name: str, class_name: str):
    """Remove a class from a project."""
    project_dir = _get_project_dir(name)
    meta = _load_project_meta(project_dir)

    if class_name not in meta["classes"]:
        raise HTTPException(404, "Class not found")

    meta["classes"].remove(class_name)
    _save_project_meta(project_dir, meta)

    return {"classes": meta["classes"]}
