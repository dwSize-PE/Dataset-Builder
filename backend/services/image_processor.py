"""Image processing: import images into project frames."""
import shutil
from pathlib import Path
from PIL import Image
from ..config import MAX_FRAME_DIMENSION, THUMBNAIL_SIZE, IMAGE_EXTENSIONS


def import_images(
    image_paths: list[Path],
    output_dir: Path,
) -> list[str]:
    """Import image files into the project frames directory.

    Returns list of saved frame filenames.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    thumb_dir = output_dir.parent / "thumbnails"
    thumb_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    save_idx = _get_next_index(output_dir)

    for img_path in image_paths:
        if img_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        filename = f"frame_{save_idx:06d}.jpg"
        dest = output_dir / filename

        img = Image.open(img_path)
        img = img.convert("RGB")
        img = _resize_if_needed(img)
        img.save(dest, "JPEG", quality=95)

        # Thumbnail
        _generate_thumbnail(dest, thumb_dir)

        saved.append(filename)
        save_idx += 1

    return saved


def import_single_image(image_path: Path, output_dir: Path) -> str:
    """Import a single image. Returns the saved filename."""
    result = import_images([image_path], output_dir)
    return result[0] if result else ""


def _resize_if_needed(img: Image.Image) -> Image.Image:
    """Resize if exceeds max dimension, keeping aspect ratio."""
    w, h = img.size
    if max(w, h) <= MAX_FRAME_DIMENSION:
        return img
    scale = MAX_FRAME_DIMENSION / max(w, h)
    new_size = (int(w * scale), int(h * scale))
    return img.resize(new_size, Image.LANCZOS)


def _generate_thumbnail(image_path: Path, thumb_dir: Path):
    """Generate thumbnail for an image."""
    thumb_path = thumb_dir / image_path.name
    img = Image.open(image_path)
    img.thumbnail(THUMBNAIL_SIZE)
    img.save(thumb_path, "JPEG", quality=80)


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
