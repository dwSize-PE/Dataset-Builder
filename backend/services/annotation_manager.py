"""Annotation storage: JSON-based annotation management."""
import json
from pathlib import Path
from ..models.schemas import FrameAnnotation, BoundingBox


def save_annotation(project_dir: Path, annotation: FrameAnnotation):
    """Save annotation for a specific frame."""
    ann_dir = project_dir / "annotations"
    ann_dir.mkdir(parents=True, exist_ok=True)

    filename = Path(annotation.frame_filename).stem + ".json"
    ann_path = ann_dir / filename

    data = {
        "frame_filename": annotation.frame_filename,
        "skipped": annotation.skipped,
        "boxes": [box.model_dump() for box in annotation.boxes],
    }

    with open(ann_path, "w") as f:
        json.dump(data, f, indent=2)


def load_annotation(project_dir: Path, frame_filename: str) -> FrameAnnotation | None:
    """Load annotation for a specific frame."""
    ann_dir = project_dir / "annotations"
    filename = Path(frame_filename).stem + ".json"
    ann_path = ann_dir / filename

    if not ann_path.exists():
        return None

    with open(ann_path) as f:
        data = json.load(f)

    return FrameAnnotation(
        frame_filename=data["frame_filename"],
        skipped=data.get("skipped", False),
        boxes=[BoundingBox(**box) for box in data.get("boxes", [])],
    )


def delete_annotation(project_dir: Path, frame_filename: str):
    """Delete annotation for a specific frame."""
    ann_dir = project_dir / "annotations"
    filename = Path(frame_filename).stem + ".json"
    ann_path = ann_dir / filename
    if ann_path.exists():
        ann_path.unlink()


def get_all_annotations(project_dir: Path) -> dict[str, FrameAnnotation]:
    """Get all annotations for a project, keyed by frame filename."""
    ann_dir = project_dir / "annotations"
    if not ann_dir.exists():
        return {}

    annotations = {}
    for ann_path in sorted(ann_dir.glob("*.json")):
        with open(ann_path) as f:
            data = json.load(f)
        frame_fn = data["frame_filename"]
        annotations[frame_fn] = FrameAnnotation(
            frame_filename=frame_fn,
            skipped=data.get("skipped", False),
            boxes=[BoundingBox(**box) for box in data.get("boxes", [])],
        )
    return annotations


def get_annotation_stats(project_dir: Path, classes: list[str]) -> dict:
    """Get annotation statistics for a project."""
    annotations = get_all_annotations(project_dir)
    frames_dir = project_dir / "frames"
    total_frames = len(list(frames_dir.glob("frame_*.jpg"))) if frames_dir.exists() else 0

    annotated = 0
    skipped = 0
    total_boxes = 0
    class_counts = {cls: 0 for cls in classes}

    for ann in annotations.values():
        if ann.skipped:
            skipped += 1
        elif ann.boxes:
            annotated += 1
            total_boxes += len(ann.boxes)
            for box in ann.boxes:
                if box.class_name in class_counts:
                    class_counts[box.class_name] += 1

    return {
        "total_frames": total_frames,
        "annotated_frames": annotated,
        "skipped_frames": skipped,
        "total_boxes": total_boxes,
        "class_counts": class_counts,
    }
