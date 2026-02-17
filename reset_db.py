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
    print(f"Created default workouts: {defaults}")
    db.close()

if __name__ == "__main__":
    reset_database()
