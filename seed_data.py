from backend.database import SessionLocal
from backend.models_db import User, Workout, WorkoutSession
from datetime import datetime, timedelta
import random

def seed_data(username="test"):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"User '{username}' not found. creating...")
            user = User(username=username)
            db.add(user)
            db.commit()
            db.refresh(user)

        # Ensure we have at least one workout
        workout = db.query(Workout).filter(Workout.name == "Push").first()
        if not workout:
            print("No 'Push' workout found. Creating...")
            workout = Workout(name="Push")
            db.add(workout)
            db.commit()
            db.refresh(workout)

        print(f"Seeding data for user: {user.username}")

        # clear existing sessions for clean test
        db.query(WorkoutSession).filter(WorkoutSession.user_id == user.id).delete()

        # Generate sessions for the last 12 weeks
        end_date = datetime.utcnow()
        sessions_to_add = []
        
        
        # Track used dates to avoid duplicates
        used_dates = set()

        # Add some consistency data
        for i in range(12):
            # darker squares (more workouts) in recent weeks
            num_workouts = random.randint(1, 4) 
            week_start = end_date - timedelta(weeks=i)
            
            for _ in range(num_workouts):
                # Random day in that week, ensure unique
                for attempt in range(10):
                    day_offset = random.randint(0, 6)
                    session_date = week_start - timedelta(days=day_offset)
                    date_str = session_date.strftime("%Y-%m-%d")
                    if date_str not in used_dates:
                        used_dates.add(date_str)
                        break
                
                duration = random.randint(30, 90)
                volume = random.randint(5000, 15000)
                
                pr_count = random.choices([0, 1, 2], weights=[0.8, 0.15, 0.05])[0]
                pr_details = None
                
                if pr_count > 0:
                    exercises = ["Bench Press", "Squat", "Deadlift", "Overhead Press", "Pull Up"]
                    pr_exercises = random.sample(exercises, pr_count)
                    pr_details = ", ".join(pr_exercises)

                session = WorkoutSession(
                    user_id=user.id,
                    workout_id=workout.id,
                    split=random.choice(["A", "B"]),
                    start_time=session_date,
                    end_time=session_date + timedelta(minutes=duration),
                    total_volume=volume,
                    pr_count=pr_count,
                    pr_details=pr_details,
                    notes=f"Sample session {session_date.date()}"
                )
                sessions_to_add.append(session)

        db.add_all(sessions_to_add)
        db.commit()
        print(f"Successfully added {len(sessions_to_add)} sample sessions.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    import sys
    user_arg = sys.argv[1] if len(sys.argv) > 1 else "jeffjoji" # Default to likely user
    seed_data(user_arg)
