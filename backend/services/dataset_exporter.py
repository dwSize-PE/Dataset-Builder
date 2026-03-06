"""Dataset exporter: convert annotations to YOLO format and generate dataset."""
import json
import random
import shutil
import yaml
from pathlib import Path
from PIL import Image

from .annotation_manager import get_all_annotations


def export_yolo_dataset(
    project_dir: Path,
    export_dir: Path,
    classes: list[str],
    train_ratio: float = 0.8,
    val_ratio: float = 0.15,
    test_ratio: float = 0.05,
    img_size: int | None = None,
) -> dict:
    """Export project to YOLO format.

    Returns summary dict with counts.
    """
    # Validate ratios
    total_ratio = train_ratio + val_ratio + test_ratio
    if abs(total_ratio - 1.0) > 0.01:
        raise ValueError(f"Ratios must sum to 1.0, got {total_ratio}")

    # Clean export dir
    if export_dir.exists():
        shutil.rmtree(export_dir)

    # Create YOLO directory structure
    for split in ["train", "val", "test"]:
        (export_dir / split / "images").mkdir(parents=True)
        (export_dir / split / "labels").mkdir(parents=True)

    # Get all annotations (only annotated frames, not skipped)
    annotations = get_all_annotations(project_dir)
    frames_dir = project_dir / "frames"

    annotated_frames = [
        (fn, ann)
        for fn, ann in annotations.items()
        if not ann.skipped and ann.boxes
    ]

    if not annotated_frames:
        raise ValueError("No annotated frames to export")

    # Shuffle and split
    random.shuffle(annotated_frames)
    total = len(annotated_frames)
    train_count = int(total * train_ratio)
    val_count = int(total * val_ratio)

    splits = {
        "train": annotated_frames[:train_count],
        "val": annotated_frames[train_count : train_count + val_count],
        "test": annotated_frames[train_count + val_count :],
    }

    summary = {"train": 0, "val": 0, "test": 0, "total_images": total, "total_labels": 0}

    for split_name, frames in splits.items():
        for frame_fn, annotation in frames:
            src_img = frames_dir / frame_fn
            if not src_img.exists():
                continue

            dest_img = export_dir / split_name / "images" / frame_fn
            dest_label = export_dir / split_name / "labels" / (Path(frame_fn).stem + ".txt")

            # Copy/resize image
            if img_size:
                _resize_and_save(src_img, dest_img, img_size)
            else:
                shutil.copy2(src_img, dest_img)

            # Convert annotations to YOLO format
            img = Image.open(src_img)
            img_w, img_h = img.size

            label_lines = []
            for box in annotation.boxes:
                class_id = classes.index(box.class_name) if box.class_name in classes else -1
                if class_id < 0:
                    continue

                # Convert pixel coords to normalized YOLO format
                x_center = (box.x + box.w / 2) / img_w
                y_center = (box.y + box.h / 2) / img_h
                w_norm = box.w / img_w
                h_norm = box.h / img_h

                # Clamp to [0, 1]
                x_center = max(0, min(1, x_center))
                y_center = max(0, min(1, y_center))
                w_norm = max(0, min(1, w_norm))
                h_norm = max(0, min(1, h_norm))

                label_lines.append(f"{class_id} {x_center:.6f} {y_center:.6f} {w_norm:.6f} {h_norm:.6f}")

            with open(dest_label, "w") as f:
                f.write("\n".join(label_lines))

            summary[split_name] += 1
            summary["total_labels"] += len(label_lines)

    # Generate data.yaml
    data_yaml = {
        "path": str(export_dir.resolve()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "names": {i: name for i, name in enumerate(classes)},
    }

    with open(export_dir / "data.yaml", "w") as f:
        yaml.dump(data_yaml, f, default_flow_style=False, sort_keys=False)

    summary["export_path"] = str(export_dir.resolve())
    return summary


def _resize_and_save(src: Path, dest: Path, size: int):
    """Resize image to size x size and save."""
    img = Image.open(src)
    img = img.resize((size, size), Image.LANCZOS)
    img.save(dest, "JPEG", quality=95)
