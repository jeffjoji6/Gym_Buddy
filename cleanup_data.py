from backend.database import SessionLocal
from backend.models_db import Workout, User, Exercise, SetLog as DBSetLog

def cleanup_data():
    db = SessionLocal()
    try:
        print("Starting cleanup...")
        
        # 1. Delete "Pull 🧗" workout
        pull_emoji = db.query(Workout).filter(Workout.name == 'Pull 🧗').first()
        if pull_emoji:
            print(f"Deleting workout: {pull_emoji.name}")
            # Delete associated exercises
            db.query(Exercise).filter(Exercise.workout_id == pull_emoji.id).delete()
            # Delete workout
            db.delete(pull_emoji)
            
        # 2. Delete "test" user (User 3)
        test_user = db.query(User).filter(User.username == 'test').first()
        if test_user:
            print(f"Deleting user: {test_user.username}")
            # Delete sets
            db.query(DBSetLog).filter(DBSetLog.user_id == test_user.id).delete()
            # Delete created workouts
            db.query(Workout).filter(Workout.created_by_user_id == test_user.id).delete()
            # Delete user
            db.delete(test_user)
            
        # 3. Delete "Test Admin Exercise" (User 1)
        test_exercise = db.query(Exercise).filter(Exercise.name == 'Test Admin Exercise').first()
        if test_exercise:
             print(f"Deleting exercise: {test_exercise.name}")
             db.query(DBSetLog).filter(DBSetLog.exercise_id == test_exercise.id).delete()
             db.delete(test_exercise)

        # 4. Delete generic "test" exercise (User 2 or others)
        generic_test = db.query(Exercise).filter(Exercise.name == 'test').first()
        if generic_test:
             print(f"Deleting exercise: {generic_test.name}")
             db.query(DBSetLog).filter(DBSetLog.exercise_id == generic_test.id).delete()
             db.delete(generic_test)
             
        db.commit()
        print("Cleanup complete.")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_data()
