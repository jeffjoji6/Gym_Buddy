from backend.database import SessionLocal, engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN pr_details TEXT"))
            print("Added pr_details column to workout_sessions")
        except Exception as e:
            print(f"Column might already exist or error: {e}")

if __name__ == "__main__":
    migrate()
