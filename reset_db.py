from backend.database import engine, Base
from backend.models_db import User, Workout, Exercise, SetLog, WorkoutSession

def reset_database():
    print("Resetting database...")
    # Drop all tables
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped.")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("All tables created with new schema.")

    # Seed Admin User
    from backend.data_manager import DataManager
    db = DataManager().get_db()
    
    admin_user = User(username="admin", is_admin=1)
    db.add(admin_user)
    db.commit()
    print("Created admin user: 'admin'")

    # Seed Default Workouts (owned by Admin)
    defaults = ["Push", "Pull", "Legs"]
    for w in defaults:
        workout = Workout(name=w, created_by_user_id=admin_user.id)
        db.add(workout)
    
    db.commit()
    db.commit()
    print(f"Created default workouts: {defaults}")

    # Seed Default Exercises for Push (Split A)
    push_workout = db.query(Workout).filter(Workout.name == "Push").first()
    if push_workout:
        push_exercises = [
            "Bench press",
            "Inclined dumbell press", 
            "Triceps bar push down",
            "Chest Decline cable",
            "Shoulder cable side raise/press",
            "Triceps Skull crusher"
        ]
        for ex_name in push_exercises:
            ex = Exercise(
                workout_id=push_workout.id,
                name=ex_name,
                default_sets=3,
                split="A",
                user_id=None # Global default
            )
            db.add(ex)
        db.commit()
        print("Seeded default Push exercises")

    db.close()

if __name__ == "__main__":
    reset_database()
