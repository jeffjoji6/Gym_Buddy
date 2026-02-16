from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .models import (
    LogRequest, LogResponse, WorkoutData, UserLogRequest, 
    UpdateSetRequest, DeleteSetRequest, GenericResponse,
    UserListResponse, CreateWorkoutRequest, AddExerciseRequest,
    WorkoutListResponse
)
from .data_manager import DataManager
from .nlp import NLPProcessor

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

data_manager = DataManager()
nlp_processor = NLPProcessor()

class ParseRequest(BaseModel):
    text: str
    workout_type: str
    user: str

class ParseResponse(BaseModel):
    success: bool
    data: dict | None = None
    message: str | None = None

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.get("/api/users", response_model=UserListResponse)
async def get_users():
    users = data_manager.get_users()
    return UserListResponse(users=users)

@app.get("/api/workouts", response_model=WorkoutListResponse)
async def get_workouts():
    workouts = data_manager.get_workouts()
    return WorkoutListResponse(workouts=workouts)

@app.delete("/api/user/{username}", response_model=GenericResponse)
async def delete_user(username: str):
    success, message = data_manager.delete_user(username)
    if not success:
        return GenericResponse(success=False, message=message)
    return GenericResponse(success=True, message=message)

@app.get("/api/workout/{workout_type}")
async def get_workout(workout_type: str, user: str, week: int = 1, split: str = "A"):
    exercises = data_manager.get_workout_data(workout_type, week, user, split)
    return WorkoutData(
        workout_type=workout_type,
        exercises=exercises,
        active_week=week
    )

@app.post("/api/log", response_model=LogResponse)
async def log_set(request: UserLogRequest):
    success, message = data_manager.log_set(
        request.workout_type,
        request.exercise_name,
        request.weight,
        request.reps,
        request.week,
        request.user
    )
    
    if not success:
        return LogResponse(success=False, message=message)
        
    return LogResponse(
        success=True, 
        message=message
    )

@app.put("/api/set/update", response_model=GenericResponse)
async def update_set(request: UpdateSetRequest):
    success, message = data_manager.update_set(
        request.set_id,
        request.weight,
        request.reps,
        request.user
    )
    return GenericResponse(success=success, message=message)

@app.delete("/api/set/delete", response_model=GenericResponse)
async def delete_set(request: DeleteSetRequest):
    success, message = data_manager.delete_set(
        request.set_id,
        request.user
    )
    return GenericResponse(success=success, message=message)

@app.post("/api/parse", response_model=ParseResponse)
async def parse_command(request: ParseRequest):
    exercises = data_manager.get_workout_data(request.workout_type, 1, request.user)
    exercise_names = [e.name for e in exercises]
    
    result, error = nlp_processor.parse_command(request.text, exercise_names)
    
    if error:
        return ParseResponse(success=False, message=error)
        
    return ParseResponse(success=True, data=result)

@app.post("/api/workout", response_model=GenericResponse)
async def create_workout(request: CreateWorkoutRequest):
    success, message = data_manager.create_workout(request.name)
    return GenericResponse(success=success, message=message)

@app.post("/api/exercise", response_model=GenericResponse)
async def add_exercise(request: AddExerciseRequest):
    # Determine split from request if available, default to "A" (Split 1)
    split = getattr(request, 'split', 'A') 
    success, message = data_manager.add_exercise(request.workout_type, request.name, request.default_sets, request.user, split)
    return GenericResponse(success=success, message=message)

@app.delete("/api/exercise", response_model=GenericResponse)
async def delete_exercise(workout_type: str, exercise_name: str, user: str = None):
    success, message = data_manager.delete_exercise(workout_type, exercise_name, user)
    return GenericResponse(success=success, message=message)

@app.delete("/api/workout/{workout_type}", response_model=GenericResponse)
async def delete_workout(workout_type: str):
    success, message = data_manager.delete_workout(workout_type)
    return GenericResponse(success=success, message=message)
