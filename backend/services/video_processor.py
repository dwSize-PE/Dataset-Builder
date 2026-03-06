"""Video processing: frame extraction with OpenCV."""
import cv2
from pathlib import Path
from ..config import DEFAULT_FRAME_INTERVAL, MAX_FRAME_DIMENSION, THUMBNAIL_SIZE
from PIL import Image


def extract_frames(
    video_path: Path,
    output_dir: Path,
    frame_interval: int = DEFAULT_FRAME_INTERVAL,
) -> list[str]:
    """Extract frames from a video file.

    Returns list of saved frame filenames.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    saved = []
    frame_idx = 0
    save_idx = _get_next_index(output_dir)

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            # Resize if too large
            frame = _resize_frame(frame)
            filename = f"frame_{save_idx:06d}.jpg"
            filepath = output_dir / filename
            cv2.imwrite(str(filepath), frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            _generate_thumbnail(filepath, output_dir.parent / "thumbnails")
            saved.append(filename)
            save_idx += 1

        frame_idx += 1

    cap.release()
    return saved


def get_video_info(video_path: Path) -> dict:
    """Get video metadata."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Cannot open video: {video_path}")

    info = {
        "total_frames": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        "fps": cap.get(cv2.CAP_PROP_FPS),
        "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
    }
    info["duration_seconds"] = info["total_frames"] / info["fps"] if info["fps"] > 0 else 0
    cap.release()
    return info


def _resize_frame(frame) -> any:
    """Resize frame if exceeds max dimension, keeping aspect ratio."""
    h, w = frame.shape[:2]
    if max(h, w) <= MAX_FRAME_DIMENSION:
        return frame
    scale = MAX_FRAME_DIMENSION / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_AREA)


def _get_next_index(frames_dir: Path) -> int:
    """Get the next available frame index."""
    existing = list(frames_dir.glob("frame_*.jpg"))
    if not existing:
        return 0
    indices = []
    for f in existing:
        try:
            idx = int(f.stem.split("_")[1])
            indices.append(idx)
        except (IndexError, ValueError):
            continue
    return max(indices) + 1 if indices else 0


def _generate_thumbnail(image_path: Path, thumb_dir: Path):
    """Generate a thumbnail for a frame."""
    thumb_dir.mkdir(parents=True, exist_ok=True)
    thumb_path = thumb_dir / image_path.name
    img = Image.open(image_path)
    img.thumbnail(THUMBNAIL_SIZE)
    img.save(thumb_path, "JPEG", quality=80)
