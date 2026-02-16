from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.engine import reflection
import os

# Use DATABASE_URL env var if available (connection to Turso/LibSQL), otherwise local sqlite
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./gym_buddy.db")

connect_args = {"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args=connect_args
)

def upgrade():
    metadata = MetaData()
    metadata.reflect(bind=engine)

    if 'workout_sessions' not in metadata.tables:
        print("Creating workout_sessions table...")
        workout_sessions = Table(
            'workout_sessions', metadata,
            Column('id', Integer, primary_key=True, index=True),
            Column('user_id', Integer, ForeignKey('users.id')),
            Column('workout_id', Integer, ForeignKey('workouts.id')),
            Column('split', String, default="A"),
            Column('start_time', DateTime),
            Column('end_time', DateTime, nullable=True),
            Column('total_volume', Float, default=0.0),
            Column('notes', String, nullable=True)
        )
        workout_sessions.create(engine)
        print("Table created successfully.")
    else:
        print("workout_sessions table already exists.")

    # Check/Add session_id to sets table
    sets_table = metadata.tables['sets']
    inspector = reflection.Inspector.from_engine(engine)
    columns = [c['name'] for c in inspector.get_columns('sets')]
    
    if 'session_id' not in columns:
        print("Adding session_id column to sets table...")
        with engine.connect() as conn:
            conn.execute('ALTER TABLE sets ADD COLUMN session_id INTEGER REFERENCES workout_sessions(id)')
        print("Column added successfully.")
    else:
        print("session_id column already exists in sets table.")

if __name__ == "__main__":
    upgrade()
