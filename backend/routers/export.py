"""Export routes: generate YOLO-format dataset."""
from pathlib import Path
from fastapi import APIRouter, HTTPException
import json

from ..config import DATA_DIR, EXPORTS_DIR
from ..models.schemas import ExportRequest
from ..services.dataset_exporter import export_yolo_dataset

router = APIRouter(prefix="/api/projects/{project_name}/export", tags=["export"])


def _get_project_dir(name: str) -> Path:
    d = DATA_DIR / name
    if not d.exists():
        raise HTTPException(404, "Project not found")
    return d


@router.post("")
def export_dataset(project_name: str, req: ExportRequest):
    """Export project annotations as a YOLO dataset."""
    project_dir = _get_project_dir(project_name)

    # Load project classes
    with open(project_dir / "project.json") as f:
        meta = json.load(f)

    export_dir = EXPORTS_DIR / project_name

    try:
        summary = export_yolo_dataset(
            project_dir=project_dir,
            export_dir=export_dir,
            classes=meta["classes"],
            train_ratio=req.train_ratio,
            val_ratio=req.val_ratio,
            test_ratio=req.test_ratio,
            img_size=req.img_size,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    return summary
