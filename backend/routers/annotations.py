"""Annotation routes: save/load bounding box annotations per frame."""
from pathlib import Path
from fastapi import APIRouter, HTTPException

from ..config import DATA_DIR
from ..models.schemas import FrameAnnotation
from ..services.annotation_manager import (
    save_annotation,
    load_annotation,
    delete_annotation,
    get_all_annotations,
)

router = APIRouter(prefix="/api/projects/{project_name}/annotations", tags=["annotations"])


def _get_project_dir(name: str) -> Path:
    d = DATA_DIR / name
    if not d.exists():
        raise HTTPException(404, "Project not found")
    return d


@router.post("")
def save_frame_annotation(project_name: str, annotation: FrameAnnotation):
    """Save annotation (bounding boxes) for a frame."""
    project_dir = _get_project_dir(project_name)

    # Verify frame exists
    frame_path = project_dir / "frames" / annotation.frame_filename
    if not frame_path.exists():
        raise HTTPException(404, f"Frame not found: {annotation.frame_filename}")

    save_annotation(project_dir, annotation)
    return {"status": "saved", "frame": annotation.frame_filename}


@router.get("/{frame_filename}")
def get_frame_annotation(project_name: str, frame_filename: str):
    """Get annotation for a specific frame."""
    project_dir = _get_project_dir(project_name)
    annotation = load_annotation(project_dir, frame_filename)

    if annotation is None:
        return {"frame_filename": frame_filename, "boxes": [], "skipped": False}

    return annotation.model_dump()


@router.delete("/{frame_filename}")
def delete_frame_annotation(project_name: str, frame_filename: str):
    """Delete annotation for a specific frame."""
    project_dir = _get_project_dir(project_name)
    delete_annotation(project_dir, frame_filename)
    return {"status": "deleted"}


@router.get("")
def get_all_frame_annotations(project_name: str):
    """Get annotation status for all frames (summary)."""
    project_dir = _get_project_dir(project_name)
    annotations = get_all_annotations(project_dir)

    summary = {}
    for fn, ann in annotations.items():
        summary[fn] = {
            "has_boxes": len(ann.boxes) > 0,
            "box_count": len(ann.boxes),
            "skipped": ann.skipped,
        }
    return summary
