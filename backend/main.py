from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .models import (
    LogRequest, LogResponse, WorkoutData, UserLogRequest, 
    UpdateSetRequest, DeleteSetRequest, GenericResponse,
    UserListResponse, CreateWorkoutRequest, AddExerciseRequest,
    UserListResponse, CreateWorkoutRequest, AddExerciseRequest,
    WorkoutListResponse, StartSessionResponse, StartSessionRequest,
    EndSessionResponse, EndSessionRequest, DashboardStatsResponse,
    UpdateExerciseNotesRequest
)
from .data_manager import DataManager
from .nlp import NLPProcessor
from .database import Base, engine

from sqlalchemy import text, inspect as sa_inspect

app = FastAPI()

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database tables and run migrations."""
    # Create any missing tables
    Base.metadata.create_all(bind=engine)
    
    # Run column migrations for existing tables
    _run_migrations()
    
    # Merge custom Pull workouts into global Pull 🧗
    _merge_pull_workouts()

def _merge_pull_workouts():
    """Merge specific custom workouts into the global Pull workout and rename it."""
    try:
        with engine.connect() as conn:
            # 1. Ensure global "Pull" or "Pull 🧗" exists
            # Try to find existing "Pull 🧗" first
            result = conn.execute(text("SELECT id FROM workouts WHERE name = 'Pull 🧗'"))
            target_id = result.scalar()
            
            if not target_id:
                # Try finding "Pull"
                result = conn.execute(text("SELECT id FROM workouts WHERE name = 'Pull'"))
                pull_id = result.scalar()
                
                if pull_id:
                    # Rename "Pull" to "Pull 🧗"
                    conn.execute(text("UPDATE workouts SET name = 'Pull 🧗' WHERE id = :id"), {"id": pull_id})
                    target_id = pull_id
                    print("✓ Renamed 'Pull' to 'Pull 🧗'")
                else:
                    # Create "Pull 🧗" if neither exists
                    # Check if 'admin' user exists for creator_id
                    admin_res = conn.execute(text("SELECT id FROM users WHERE is_admin=1"))
                    admin_id = admin_res.scalar()
                    
                    conn.execute(text("INSERT INTO workouts (name, created_by_user_id) VALUES ('Pull 🧗', :uid)"), {"uid": admin_id})
                    # Get the new ID
                    result = conn.execute(text("SELECT id FROM workouts WHERE name = 'Pull 🧗'"))
                    target_id = result.scalar()
                    print("✓ Created 'Pull 🧗' workout")
            
            conn.commit()
            
            # 2. Find duplicates to merge
            # Candidates: "Jeff Pull Workout", "Sarath pulll workout"
            # We use ILIKE to match variations
            patterns = [
                'Jeff Pull Workout',
                'Sarath pulll workout', 
                'Sarath Pull Workout'
            ]
            
            for pattern in patterns:
                # Find IDs of workouts matching pattern
                rows = conn.execute(text("SELECT id, name FROM workouts WHERE name ILIKE :p AND id != :tid"), 
                                  {"p": pattern, "tid": target_id}).fetchall()
                
                for row in rows:
                    dup_id = row[0]
                    dup_name = row[1]
                    print(f"Merging '{dup_name}' (ID {dup_id}) into 'Pull 🧗' (ID {target_id})...")
                    
                    # Reassign Exercises
                    conn.execute(text("UPDATE exercises SET workout_id = :tid WHERE workout_id = :did"),
                               {"tid": target_id, "did": dup_id})
                               
                    # Reassign Sessions
                    conn.execute(text("UPDATE workout_sessions SET workout_id = :tid WHERE workout_id = :did"),
                               {"tid": target_id, "did": dup_id})
                    
                    # Delete the empty workout
                    conn.execute(text("DELETE FROM workouts WHERE id = :did"), {"did": dup_id})
                    print(f"✓ Merged and deleted '{dup_name}'")
                    
            conn.commit()
            print("✓ Pull workout merge complete")
            
    except Exception as e:
        print(f"Merge warning (non-fatal): {e}")

def _run_migrations():
    """Add missing columns to existing tables (idempotent)."""
    try:
        inspector = sa_inspect(engine)
        
        def col_exists(table, column):
            try:
                return column in [c['name'] for c in inspector.get_columns(table)]
            except Exception:
                return False
        
        with engine.connect() as conn:
            # users table
            if not col_exists("users", "is_admin"):
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0"))
                conn.commit()
            if not col_exists("users", "created_at"):
                conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
                conn.commit()
            
            # workouts table
            if not col_exists("workouts", "created_by_user_id"):
                conn.execute(text("ALTER TABLE workouts ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            
            # exercises table
            if not col_exists("exercises", "user_id"):
                conn.execute(text("ALTER TABLE exercises ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.commit()
            if not col_exists("exercises", "split"):
                conn.execute(text("ALTER TABLE exercises ADD COLUMN split VARCHAR DEFAULT 'A'"))
                conn.commit()
            if not col_exists("exercises", "setup_notes"):
                conn.execute(text("ALTER TABLE exercises ADD COLUMN setup_notes TEXT"))
                conn.commit()
            
            # sets table
            if not col_exists("sets", "timestamp"):
                conn.execute(text("ALTER TABLE sets ADD COLUMN timestamp TIMESTAMP DEFAULT NOW()"))
                conn.commit()
            
            # workout_sessions table columns
            if "workout_sessions" in inspector.get_table_names():
                if not col_exists("workout_sessions", "split"):
                    conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN split VARCHAR DEFAULT 'A'"))
                    conn.commit()
                if not col_exists("workout_sessions", "pr_count"):
                    conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN pr_count INTEGER DEFAULT 0"))
                    conn.commit()
                if not col_exists("workout_sessions", "pr_details"):
                    conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN pr_details TEXT"))
                    conn.commit()
        
        print("✓ Database migrations complete")
    except Exception as e:
        print(f"Migration warning (non-fatal): {e}")

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
async def get_workouts(user: str = None):
    workouts = data_manager.get_workouts(user)
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
    # Pass the user (username) to the create_workout function
    success, message = data_manager.create_workout(request.name, request.user)
    return GenericResponse(success=success, message=message)

@app.post("/api/exercise", response_model=GenericResponse)
async def add_exercise(request: AddExerciseRequest):
    # Determine split from request if available, default to "A" (Split 1)
    split = getattr(request, 'split', 'A') 
    setup_notes = getattr(request, 'setup_notes', None)
    success, message = data_manager.add_exercise(request.workout_type, request.name, request.default_sets, request.user, split, setup_notes)
    return GenericResponse(success=success, message=message)

@app.put("/api/exercise/notes", response_model=GenericResponse)
async def update_exercise_notes(request: UpdateExerciseNotesRequest):
    split = getattr(request, 'split', 'A')
    success, message = data_manager.update_exercise_notes(
        request.workout_type, 
        request.exercise_name, 
        request.setup_notes, 
        request.user, 
        split
    )
    return GenericResponse(success=success, message=message)

@app.delete("/api/exercise", response_model=GenericResponse)
async def delete_exercise(workout_type: str, exercise_name: str, user: str = None):
    success, message = data_manager.delete_exercise(workout_type, exercise_name, user)
    return GenericResponse(success=success, message=message)

@app.delete("/api/workout/{workout_type}", response_model=GenericResponse)
async def delete_workout(workout_type: str):
    success, message = data_manager.delete_workout(workout_type)
    return GenericResponse(success=success, message=message)

@app.post("/api/session/start", response_model=StartSessionResponse)
async def start_session(request: StartSessionRequest):
    success, session_id = data_manager.start_session(request.user, request.workout_type, request.split)
    if not success:
        return StartSessionResponse(success=False, message=str(session_id))
    return StartSessionResponse(success=True, session_id=session_id)

@app.post("/api/session/end", response_model=EndSessionResponse)
async def end_session(request: EndSessionRequest):
    success, message, duration, volume, prs = data_manager.end_session(request.session_id, request.user, request.notes)
    if not success:
        return EndSessionResponse(success=False, message=message)
    return EndSessionResponse(
        success=True, 
        message=message,
        duration_minutes=duration,
        total_volume=volume,
        prs=prs
    )

@app.get("/api/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(user: str):
    success, data = data_manager.get_user_stats(user)
    if not success:
        return DashboardStatsResponse(success=False, message=str(data))
    return DashboardStatsResponse(success=True, data=data)
