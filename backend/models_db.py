from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sets = relationship("SetLog", back_populates="user")
    sessions = relationship("WorkoutSession", back_populates="user")

class Workout(Base):
    __tablename__ = "workouts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # Push, Pull, Legs

    exercises = relationship("Exercise", back_populates="workout")
    sessions = relationship("WorkoutSession", back_populates="workout")

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    workout_id = Column(Integer, ForeignKey("workouts.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, index=True)
    default_sets = Column(Integer, default=3)
    split = Column(String, default="A") # "A" for Split 1, "B" for Split 2

    workout = relationship("Workout", back_populates="exercises")
    sets = relationship("SetLog", back_populates="exercise")

class SetLog(Base):
    __tablename__ = "sets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    week = Column(Integer, index=True)
    set_number = Column(Integer)
    weight = Column(Float)
    reps = Column(Integer)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sets")
    exercise = relationship("Exercise", back_populates="sets")
    # session = relationship("WorkoutSession", back_populates="sets") # Optional: direct link if needed

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    workout_id = Column(Integer, ForeignKey("workouts.id"))
    split = Column(String, default="A")
    start_time = Column(DateTime)
    end_time = Column(DateTime, nullable=True)
    total_volume = Column(Float, default=0.0)
    pr_count = Column(Integer, default=0)
    pr_details = Column(String, nullable=True) # JSON or comma-separated list of exercises
    notes = Column(String, nullable=True)

    user = relationship("User", back_populates="sessions")
    workout = relationship("Workout", back_populates="sessions")

