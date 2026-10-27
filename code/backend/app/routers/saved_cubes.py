"""Saved cubes router: Allows users to save up to 3 unsolved / scanned cubes to their
account so they can seamlessly scan on mobile and continue solving on desktop.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.cube import validate as validate_mod
from app.db.database import get_db
from app.db.models import SavedCube, User
from app.routers.auth import get_current_user
from app.schemas import SavedCubeCreate, SavedCubeOut

router = APIRouter(prefix="/api/cube/saved", tags=["saved-cubes"])

MAX_SAVED_CUBES = 3


@router.get("", response_model=list[SavedCubeOut])
def list_saved_cubes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Retrieve all saved cubes belonging to the authenticated user."""
    return (
        db.query(SavedCube)
        .filter(SavedCube.user_id == user.id)
        .order_by(SavedCube.created_at.desc())
        .all()
    )


@router.post("", response_model=SavedCubeOut)
def save_cube(
    body: SavedCubeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Save a cube state (max 3 per user). Validates canonical facelets before saving."""
    try:
        validate_mod.validate(body.facelets)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid cube state: {e}")

    current_count = (
        db.query(SavedCube).filter(SavedCube.user_id == user.id).count()
    )
    if current_count >= MAX_SAVED_CUBES:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum limit of {MAX_SAVED_CUBES} saved cubes reached. Please delete an older cube to save a new one.",
        )

    clean_label = (
        body.label.strip() if body.label and body.label.strip() else "Scanned Cube"
    )[:50]

    saved_row = SavedCube(
        user_id=user.id,
        label=clean_label,
        facelets=body.facelets,
    )
    db.add(saved_row)
    db.commit()
    db.refresh(saved_row)
    return saved_row


@router.delete("/{cube_id}")
def delete_saved_cube(
    cube_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a saved cube from the user's account."""
    row = (
        db.query(SavedCube)
        .filter(SavedCube.id == cube_id, SavedCube.user_id == user.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Saved cube not found")

    db.delete(row)
    db.commit()
    return {"status": "deleted", "id": cube_id}
