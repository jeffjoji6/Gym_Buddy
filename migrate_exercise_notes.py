"""
Migration script to add setup_notes column to exercises table
"""
import os
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine
from sqlalchemy import text, inspect

def migrate():
    print("Adding setup_notes column to exercises table...")
    
    with engine.connect() as conn:
        try:
            # Use SQLAlchemy inspector to check if column exists (works for both SQLite and PostgreSQL)
            inspector = inspect(engine)
            columns = [col['name'] for col in inspector.get_columns('exercises')]
            
            if 'setup_notes' in columns:
                print("✓ Column 'setup_notes' already exists. Skipping migration.")
                return
            
            # Add the column
            conn.execute(text("ALTER TABLE exercises ADD COLUMN setup_notes TEXT"))
            conn.commit()
            print("✓ Successfully added setup_notes column to exercises table")
            
        except Exception as e:
            print(f"✗ Error during migration: {e}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate()
