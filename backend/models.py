from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class SetLog(BaseModel):
    id: Optional[int] = None
    set_number: int
    weight: float
    reps: int

class Exercise(BaseModel):
    id: int
    name: str
    sets: List[SetLog] = []
    prev_week_summary: Optional[str] = None

class WorkoutData(BaseModel):
    workout_type: str
    exercises: List[Exercise]
    active_week: int

class LogRequest(BaseModel):
    workout_type: str
    exercise_name: str
    weight: float
    reps: int
    week: int

class LogResponse(BaseModel):
    success: bool
    message: str
    updated_exercise: Optional[Exercise] = None

class UserLogRequest(LogRequest):
    user: str

class UpdateSetRequest(BaseModel):
    set_id: int
    weight: float
    reps: int
    user: str

class DeleteSetRequest(BaseModel):
    set_id: int
    user: str

class GenericResponse(BaseModel):
    success: bool
    message: str

class UserSchema(BaseModel):
    id: int
    username: str
    created_at: datetime

class UserListResponse(BaseModel):
    users: List[UserSchema]

class CreateWorkoutRequest(BaseModel):
    name: str

class AddExerciseRequest(BaseModel):
    workout_type: str
    name: str
    default_sets: int = 3
    user: str | None = None
    split: str = "A"

class WorkoutListResponse(BaseModel):
    workouts: List[str]
