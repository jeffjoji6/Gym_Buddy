
from backend.database import SessionLocal
from backend.models_db import Workout, User

def inspect_workouts():
    db = SessionLocal()
    try:
        workouts = db.query(Workout).all()
        print(f"{'ID':<5} {'Name':<30} {'Creator ID':<10}")
        print("-" * 50)
        for w in workouts:
            print(f"{w.id:<5} {w.name:<30} {w.created_by_user_id:<10}")
            
        print("\nUsers:")
        users = db.query(User).all()
        for u in users:
            print(f"{u.id:<5} {u.username:<20}")
            
    finally:
        db.close()

if __name__ == "__main__":
    inspect_workouts()
