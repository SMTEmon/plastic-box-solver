from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)          # login identity (FR-01/02)
    display_name = Column(String, unique=True, index=True)    # shown on leaderboard (FR-03)
    avatar = Column(String, nullable=True)                    # avatar URL / identifier (FR-03)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    solves = relationship("Solve", back_populates="user")

class Solve(Base):
    __tablename__ = "solves"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    solve_time = Column(Float)        # seconds the user took
    move_count = Column(Integer)      # moves user actually did
    optimal_moves = Column(Integer)   # moves from the solution
    efficiency = Column(Float)        # (optimal/actual)*100
    scramble = Column(String)
    solution = Column(String)
    method = Column(String, default="Beginner")
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="solves")
