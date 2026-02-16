"""
Initialize database tables for production deployment.
Run this once after setting up the database.
"""
from backend.database import engine, Base
from backend.models_db import User, Workout, Exercise, SetLog, WorkoutSession

def init_database():
    """Create all tables in the database."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully!")
    
    # List all tables created
    print("\nTables created:")
    for table in Base.metadata.sorted_tables:
        print(f"  - {table.name}")

if __name__ == "__main__":
    init_database()
