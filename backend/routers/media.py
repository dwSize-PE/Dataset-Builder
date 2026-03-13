"""Media upload routes (images and videos)."""
import shutil
import tempfile
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File, Form

from ..config import DATA_DIR, VIDEO_EXTENSIONS, IMAGE_EXTENSIONS
from ..services.video_processor import extract_frames, get_video_info
from ..services.image_processor import import_images

router = APIRouter(prefix="/api/projects/{project_name}/media", tags=["media"])


def _get_project_dir(name: str) -> Path:
    d = DATA_DIR / name
    if not d.exists():
        raise HTTPException(404, "Project not found")
    return d


@router.post("/upload")
async def upload_media(
    project_name: str,
    files: list[UploadFile] = File(...),
):
    """Upload images and/or videos. Videos are auto-extracted into frames."""
    project_dir = _get_project_dir(project_name)
    frames_dir = project_dir / "frames"
    raw_dir = project_dir / "raw"

    all_saved = []
    video_info_list = []

    for file in files:
        suffix = Path(file.filename).suffix.lower()

        # Save to temp file first
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = Path(tmp.name)

        try:
            if suffix in VIDEO_EXTENSIONS:
                # Save raw video
                raw_path = raw_dir / file.filename
                shutil.move(str(tmp_path), str(raw_path))

                # Extract frames
                info = get_video_info(raw_path)
                saved = extract_frames(raw_path, frames_dir)
                all_saved.extend(saved)
                video_info_list.append({
                    "filename": file.filename,
                    "frames_extracted": len(saved),
                    **info,
                })

            elif suffix in IMAGE_EXTENSIONS:
                saved = import_images([tmp_path], frames_dir)
                all_saved.extend(saved)
            else:
                continue
        finally:
            if tmp_path.exists():
                tmp_path.unlink()

    return {
        "total_frames_added": len(all_saved),
        "frames": all_saved,
        "videos_processed": video_info_list,
    }


@router.get("/frames")
def list_frames(project_name: str):
    """List all frames in the project."""
    project_dir = _get_project_dir(project_name)
    frames_dir = project_dir / "frames"

    if not frames_dir.exists():
        return []

    frames = sorted(f.name for f in frames_dir.glob("frame_*.jpg"))
    return frames


@router.delete("/frames/{filename}")
def delete_frame(project_name: str, filename: str):
    """Delete a specific frame and its annotation."""
    project_dir = _get_project_dir(project_name)
    frame_path = project_dir / "frames" / filename
    thumb_path = project_dir / "thumbnails" / filename
    ann_path = project_dir / "annotations" / (Path(filename).stem + ".json")

    if not frame_path.exists():
        raise HTTPException(404, "Frame not found")

    frame_path.unlink()
    if thumb_path.exists():
        thumb_path.unlink()
    if ann_path.exists():
        ann_path.unlink()

    return {"status": "deleted"}
