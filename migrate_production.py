"""
Comprehensive migration script for production Vercel Postgres database.
Adds all missing columns and tables to bring schema up to date.

Usage:
  DATABASE_URL="postgresql://..." python migrate_production.py
"""
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text, inspect

# Get DATABASE_URL from env or prompt
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL environment variable is required.")
    print("Usage: DATABASE_URL='postgresql://...' python migrate_production.py")
    sys.exit(1)

# Fix postgres:// to postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def column_exists(inspector, table, column):
    """Check if a column exists in a table"""
    try:
        columns = [col['name'] for col in inspector.get_columns(table)]
        return column in columns
    except Exception:
        return False

def table_exists(inspector, table):
    """Check if a table exists"""
    return table in inspector.get_table_names()

def migrate():
    inspector = inspect(engine)
    
    with engine.connect() as conn:
        print("=" * 50)
        print("Production Database Migration")
        print("=" * 50)
        
        # ---- USERS TABLE ----
        print("\n[users table]")
        
        if not table_exists(inspector, "users"):
            print("  Creating users table...")
            conn.execute(text("""
                CREATE TABLE users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR UNIQUE NOT NULL,
                    is_admin INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("  ✓ Created users table")
        else:
            if not column_exists(inspector, "users", "is_admin"):
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0"))
                conn.commit()
                print("  ✓ Added is_admin column")
            else:
                print("  - is_admin already exists")
            
            if not column_exists(inspector, "users", "created_at"):
                conn.execute(text("ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW()"))
                conn.commit()
                print("  ✓ Added created_at column")
            else:
                print("  - created_at already exists")
        
        # ---- WORKOUTS TABLE ----
        print("\n[workouts table]")
        
        if not table_exists(inspector, "workouts"):
            print("  Creating workouts table...")
            conn.execute(text("""
                CREATE TABLE workouts (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR UNIQUE NOT NULL,
                    created_by_user_id INTEGER REFERENCES users(id)
                )
            """))
            conn.commit()
            print("  ✓ Created workouts table")
        else:
            if not column_exists(inspector, "workouts", "created_by_user_id"):
                conn.execute(text("ALTER TABLE workouts ADD COLUMN created_by_user_id INTEGER REFERENCES users(id)"))
                conn.commit()
                print("  ✓ Added created_by_user_id column")
            else:
                print("  - created_by_user_id already exists")
        
        # ---- EXERCISES TABLE ----
        print("\n[exercises table]")
        
        if not table_exists(inspector, "exercises"):
            print("  Creating exercises table...")
            conn.execute(text("""
                CREATE TABLE exercises (
                    id SERIAL PRIMARY KEY,
                    workout_id INTEGER REFERENCES workouts(id),
                    user_id INTEGER REFERENCES users(id),
                    name VARCHAR NOT NULL,
                    default_sets INTEGER DEFAULT 3,
                    split VARCHAR DEFAULT 'A',
                    setup_notes TEXT
                )
            """))
            conn.commit()
            print("  ✓ Created exercises table")
        else:
            if not column_exists(inspector, "exercises", "user_id"):
                conn.execute(text("ALTER TABLE exercises ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.commit()
                print("  ✓ Added user_id column")
            else:
                print("  - user_id already exists")
            
            if not column_exists(inspector, "exercises", "split"):
                conn.execute(text("ALTER TABLE exercises ADD COLUMN split VARCHAR DEFAULT 'A'"))
                conn.commit()
                print("  ✓ Added split column")
            else:
                print("  - split already exists")
            
            if not column_exists(inspector, "exercises", "setup_notes"):
                conn.execute(text("ALTER TABLE exercises ADD COLUMN setup_notes TEXT"))
                conn.commit()
                print("  ✓ Added setup_notes column")
            else:
                print("  - setup_notes already exists")
        
        # ---- SETS TABLE ----
        print("\n[sets table]")
        
        if not table_exists(inspector, "sets"):
            print("  Creating sets table...")
            conn.execute(text("""
                CREATE TABLE sets (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    exercise_id INTEGER REFERENCES exercises(id),
                    week INTEGER,
                    set_number INTEGER,
                    weight FLOAT,
                    reps INTEGER,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            """))
            conn.commit()
            print("  ✓ Created sets table")
        else:
            if not column_exists(inspector, "sets", "timestamp"):
                conn.execute(text("ALTER TABLE sets ADD COLUMN timestamp TIMESTAMP DEFAULT NOW()"))
                conn.commit()
                print("  ✓ Added timestamp column")
            else:
                print("  - timestamp already exists")
        
        # ---- WORKOUT_SESSIONS TABLE ----
        print("\n[workout_sessions table]")
        
        if not table_exists(inspector, "workout_sessions"):
            print("  Creating workout_sessions table...")
            conn.execute(text("""
                CREATE TABLE workout_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id),
                    workout_id INTEGER REFERENCES workouts(id),
                    split VARCHAR DEFAULT 'A',
                    start_time TIMESTAMP,
                    end_time TIMESTAMP,
                    total_volume FLOAT DEFAULT 0.0,
                    pr_count INTEGER DEFAULT 0,
                    pr_details TEXT,
                    notes TEXT
                )
            """))
            conn.commit()
            print("  ✓ Created workout_sessions table")
        else:
            if not column_exists(inspector, "workout_sessions", "split"):
                conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN split VARCHAR DEFAULT 'A'"))
                conn.commit()
                print("  ✓ Added split column")
            else:
                print("  - split already exists")
            
            if not column_exists(inspector, "workout_sessions", "pr_count"):
                conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN pr_count INTEGER DEFAULT 0"))
                conn.commit()
                print("  ✓ Added pr_count column")
            else:
                print("  - pr_count already exists")
            
            if not column_exists(inspector, "workout_sessions", "pr_details"):
                conn.execute(text("ALTER TABLE workout_sessions ADD COLUMN pr_details TEXT"))
                conn.commit()
                print("  ✓ Added pr_details column")
            else:
                print("  - pr_details already exists")
        
        # ---- SEED DEFAULT DATA ----
        print("\n[Seeding defaults]")
        
        # Ensure admin user exists
        result = conn.execute(text("SELECT id FROM users WHERE username = 'admin'"))
        admin = result.fetchone()
        if not admin:
            conn.execute(text("INSERT INTO users (username, is_admin) VALUES ('admin', 1)"))
            conn.commit()
            print("  ✓ Created admin user")
        else:
            print("  - admin user already exists")
        
        # Ensure default workouts exist
        for workout_name in ["Push", "Pull", "Legs"]:
            result = conn.execute(text("SELECT id FROM workouts WHERE name = :name"), {"name": workout_name})
            if not result.fetchone():
                conn.execute(text("INSERT INTO workouts (name) VALUES (:name)"), {"name": workout_name})
                conn.commit()
                print(f"  ✓ Created {workout_name} workout")
            else:
                print(f"  - {workout_name} workout already exists")
        
        # Seed Push exercises (Split A)
        result = conn.execute(text("SELECT id FROM workouts WHERE name = 'Push'"))
        push = result.fetchone()
        if push:
            push_exercises = [
                "Bench press",
                "Inclined dumbell press",
                "Triceps bar push down",
                "Chest Decline cable",
                "Shoulder cable side raise/press",
                "Triceps Skull crusher"
            ]
            for ex_name in push_exercises:
                result = conn.execute(text(
                    "SELECT id FROM exercises WHERE workout_id = :wid AND name = :name AND split = 'A'"
                ), {"wid": push[0], "name": ex_name})
                if not result.fetchone():
                    conn.execute(text(
                        "INSERT INTO exercises (workout_id, name, default_sets, split) VALUES (:wid, :name, 3, 'A')"
                    ), {"wid": push[0], "name": ex_name})
                    conn.commit()
                    print(f"  ✓ Added exercise: {ex_name}")
                else:
                    print(f"  - Exercise already exists: {ex_name}")
        
        print("\n" + "=" * 50)
        print("Migration complete!")
        print("=" * 50)

if __name__ == "__main__":
    migrate()
