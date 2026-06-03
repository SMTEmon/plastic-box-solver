# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, solver, leaderboard

# Creates all DB tables automatically when the app starts
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Plastic Box Solver API",
    description="Rubik's Cube teaching backend",
    version="1.0.0"
)

# CORS — this is what lets your React frontend talk to this backend
# React runs on localhost:5173 (Vite default), backend on localhost:8000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(solver.router)
app.include_router(leaderboard.router)

@app.get("/")
def root():
    return {"message": "Plastic Box Solver API is running!"}