from backend.database import SessionLocal
from backend.models_db import Exercise, Workout

def inspect_exercises():
    db = SessionLocal()
    try:
        exercises = db.query(Exercise).all()
        print(f"{'ID':<5} {'Workout':<15} {'Name':<30} {'User ID':<10} {'Split':<5}")
        print("-" * 70)
        for e in exercises:
            workout_name = e.workout.name if e.workout else "None"
            user_id_str = str(e.user_id) if e.user_id is not None else "None"
            split_str = str(e.split) if e.split else "None"
            print(f"{e.id:<5} {workout_name:<15} {e.name:<30} {user_id_str:<10} {split_str:<5}")
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect_exercises()
