# The imp/collections/lib2to3 compat shim MUST be imported before anything
# that imports rubik_solver (directly or transitively). Keep this as the
# very first import in the app.
from app import _compat_imp_shim  # noqa: F401

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Database imports
from app.db.database import engine, Base
from app.routers import cube, auth

# Creates all DB tables automatically when the app starts
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plastic Box Solver API",
    description="Rubik's Cube teaching backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],  # your Vite/CRA dev servers
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(cube.router)
app.include_router(auth.router)

@app.get("/health")
def health():
    return {"status": "ok"}
