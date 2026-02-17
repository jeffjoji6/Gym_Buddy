
from backend.database import SessionLocal
from backend.models_db import Workout, Exercise
from backend.data_manager import DataManager

def seed_defaults():
    db = SessionLocal()
    try:
        # Get Push Workout
        push_workout = db.query(Workout).filter(Workout.name == "Push").first()
        if not push_workout:
            print("Push workout not found!")
            return

        exercises = [
            "Bench press",
            "Inclined dumbell press", 
            "Triceps bar push down",
            "Chest Decline cable",
            "Shoulder cable side raise/press",
            "Triceps Skull crusher"
        ]

        print(f"Seeding default exercises for {push_workout.name} (Split A)...")
        
        for ex_name in exercises:
            # Check if exists
            exists = db.query(Exercise).filter(
                Exercise.workout_id == push_workout.id,
                Exercise.name == ex_name,
                Exercise.split == "A"
            ).first()
            
            if not exists:
                new_ex = Exercise(
                    workout_id=push_workout.id,
                    name=ex_name,
                    default_sets=3,
                    split="A",
                    # user_id is null for global defaults
                    user_id=None 
                )
                db.add(new_ex)
                print(f"Added: {ex_name}")
            else:
                print(f"Skipped (exists): {ex_name}")
        
        db.commit()
        print("Done!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_defaults()
