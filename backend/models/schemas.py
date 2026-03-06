"""Pydantic schemas for request/response models."""
from pydantic import BaseModel
from typing import Optional


class ProjectCreate(BaseModel):
    name: str
    classes: list[str]


class ProjectUpdate(BaseModel):
    classes: list[str] | None = None


class ClassAdd(BaseModel):
    name: str


class BoundingBox(BaseModel):
    class_id: int
    class_name: str
    x: float  # top-left x (pixel)
    y: float  # top-left y (pixel)
    w: float  # width (pixel)
    h: float  # height (pixel)


class FrameAnnotation(BaseModel):
    frame_filename: str
    boxes: list[BoundingBox]
    skipped: bool = False


class ExportRequest(BaseModel):
    train_ratio: float = 0.8
    val_ratio: float = 0.15
    test_ratio: float = 0.05
    img_size: int | None = None  # Optional resize (e.g. 640)


class ProjectInfo(BaseModel):
    name: str
    classes: list[str]
    total_frames: int
    annotated_frames: int
    skipped_frames: int
    total_boxes: int
    class_counts: dict[str, int]
