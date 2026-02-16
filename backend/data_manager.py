from .database import SessionLocal
from .models_db import User, Workout, Exercise, SetLog as DBSetLog
from .models import Exercise as APIExercise, SetLog as APISetLog, UserSchema
from fuzzywuzzy import process
from sqlalchemy.orm import joinedload
from sqlalchemy import func

class DataManager:
    def __init__(self):
        pass

    def get_db(self):
        return SessionLocal()

    def ensure_user(self, db, username: str):
        user = db.query(User).filter(User.username == username).first()
        if not user:
            user = User(username=username)
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    def get_users(self):
        db = self.get_db()
        try:
            users = db.query(User).all()
            return [UserSchema(id=u.id, username=u.username, created_at=u.created_at) for u in users]
        finally:
            db.close()

    def get_workouts(self):
        db = self.get_db()
        try:
            workouts = db.query(Workout).all()
            return [w.name for w in workouts]
        finally:
            db.close()

    def delete_user(self, username: str):
        db = self.get_db()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user:
                return False, "User not found"
            
            # Cascade delete is not set up in models_db explicitly with cascade="all, delete", 
            # so we should manually delete related sets or rely on DB FK cascade if configured (SQLite default often OFF).
            # Easier to manually delete sets first.
            
            db.query(DBSetLog).filter(DBSetLog.user_id == user.id).delete()
            db.delete(user)
            db.commit()
            return True, f"User {username} deleted"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def get_workout_data(self, workout_type: str, week: int, username: str, split: str = "A") -> list[APIExercise]:
        db = self.get_db()
        try:
            workout = db.query(Workout).filter(Workout.name == workout_type).first()
            if not workout:
                return []
            
            user = self.ensure_user(db, username)
            
            exercises_db = db.query(Exercise).filter(
                Exercise.workout_id == workout.id,
                Exercise.split == split
            ).all()
            
            result = []
            for ex in exercises_db:
                sets_db = db.query(DBSetLog).filter(
                    DBSetLog.user_id == user.id,
                    DBSetLog.exercise_id == ex.id,
                    DBSetLog.week == week
                ).order_by(DBSetLog.set_number).all()
                
                current_sets = [
                    APISetLog(id=s.id, set_number=s.set_number, weight=s.weight, reps=s.reps)
                    for s in sets_db
                ]
                
                prev_summary = None
                if week > 1:
                    prev_sets = db.query(DBSetLog).filter(
                        DBSetLog.user_id == user.id,
                        DBSetLog.exercise_id == ex.id,
                        DBSetLog.week == week - 1
                    ).order_by(DBSetLog.set_number).all()
                    
                    if prev_sets:
                        prev_summary = ", ".join([f"{s.weight}x{s.reps}" for s in prev_sets])
                
                result.append(APIExercise(
                    id=ex.id,
                    name=ex.name,
                    sets=current_sets,
                    prev_week_summary=prev_summary
                ))
                
            return result
        finally:
            db.close()

    def log_set(self, workout_type: str, exercise_name: str, weight: float, reps: int, week: int, username: str):
        db = self.get_db()
        try:
            user = self.ensure_user(db, username)
            workout = db.query(Workout).filter(Workout.name == workout_type).first()
            if not workout:
                 return False, "Workout type not found"
            
            exercises = db.query(Exercise).filter(Exercise.workout_id == workout.id).all()
            exercise_names = [e.name for e in exercises]
            
            best_match, score = process.extractOne(exercise_name, exercise_names)
            if score < 70:
                return False, f"Exercise '{exercise_name}' not found."
            
            exercise = next(e for e in exercises if e.name == best_match)
            
            count = db.query(DBSetLog).filter(
                DBSetLog.user_id == user.id,
                DBSetLog.exercise_id == exercise.id,
                DBSetLog.week == week
            ).count()
            
            next_set_num = count + 1
            
            log = DBSetLog(
                user_id=user.id,
                exercise_id=exercise.id,
                week=week,
                set_number=next_set_num,
                weight=weight,
                reps=reps
            )
            db.add(log)
            db.commit()
            
            return True, f"Logged {weight}x{reps} for {best_match}"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def update_set(self, set_id: int, weight: float, reps: int, username: str):
        db = self.get_db()
        try:
            # We don't really need username if ID is unique, but safer check
            user = self.ensure_user(db, username)
            log = db.query(DBSetLog).filter(DBSetLog.id == set_id, DBSetLog.user_id == user.id).first()
            if not log:
                return False, "Set not found or unauthorized"
            
            log.weight = weight
            log.reps = reps
            db.commit()
            return True, "Set updated"
        finally:
            db.close()

    def delete_set(self, set_id: int, username: str):
        db = self.get_db()
        try:
            user = self.ensure_user(db, username)
            log = db.query(DBSetLog).filter(DBSetLog.id == set_id, DBSetLog.user_id == user.id).first()
            if not log:
                return False, "Set not found or unauthorized"
            
            exercise_id = log.exercise_id
            week = log.week
            
            db.delete(log)
            db.commit() # Delete first to remove from index
            
            # Reorder
            remaining = db.query(DBSetLog).filter(
                DBSetLog.user_id == user.id,
                DBSetLog.exercise_id == exercise_id,
                DBSetLog.week == week
            ).order_by(DBSetLog.set_number).all()
            
            for idx, s in enumerate(remaining):
                s.set_number = idx + 1
            
            db.commit()
            return True, "Set deleted"
        finally:
            db.close()

    def create_workout(self, name: str):
        db = self.get_db()
        try:
            existing = db.query(Workout).filter(Workout.name == name).first()
            if existing:
                return False, f"Workout '{name}' already exists"
                
            workout = Workout(name=name)
            db.add(workout)
            db.commit()
            return True, f"Workout '{name}' created"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def add_exercise(self, workout_type: str, name: str, default_sets: int = 3, username: str = None, split: str = "A"):
        db = self.get_db()
        try:
            workout = db.query(Workout).filter(Workout.name == workout_type).first()
            if not workout:
                return False, "Workout type not found"
                
            if username:
                user = self.ensure_user(db, username)
            else:
                user = None

            existing = db.query(Exercise).filter(
                Exercise.workout_id == workout.id, 
                Exercise.name == name,
                Exercise.split == split
            ).first()
            if existing:
                return False, f"Exercise '{name}' already exists in {workout_type}"
                
            exercise = Exercise(
                workout_id=workout.id, 
                name=name, 
                default_sets=default_sets,
                user_id=user.id if user else None,
                split=split
            )
            db.add(exercise)
            db.commit()
            return True, f"Added '{name}' to {workout_type}"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def delete_exercise(self, workout_type: str, exercise_name: str, username: str = None):
        """Delete an exercise from a workout"""
        db = self.get_db()
        try:
            workout = db.query(Workout).filter(Workout.name == workout_type).first()
            if not workout:
                return False, "Workout type not found"
            
            query = db.query(Exercise).filter(
                Exercise.workout_id == workout.id,
                Exercise.name == exercise_name
            )
            
            # Handle user scoping
            if username == 'admin':
                # Admin deletes global defaults
                exercise = query.filter(Exercise.user_id == None).first()
            elif username:
                user = self.ensure_user(db, username)
                exercise = query.filter(Exercise.user_id == user.id).first()
            else:
                # Legacy/fallback
                exercise = query.first()
            
            if not exercise:
                return False, f"Exercise '{exercise_name}' not found or you don't have permission"
            
            # Delete all sets associated with this exercise (use DBSetLog not Set)
            db.query(DBSetLog).filter(DBSetLog.exercise_id == exercise.id).delete()
            
            # Delete the exercise
            db.delete(exercise)
            db.commit()
            return True, f"Exercise '{exercise_name}' deleted successfully"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def delete_workout(self, workout_type: str):
        """Delete an entire workout and all associated exercises/sets"""
        db = self.get_db()
        try:
            workout = db.query(Workout).filter(Workout.name == workout_type).first()
            if not workout:
                return False, "Workout type not found"
            
            # Get all exercises for this workout
            exercises = db.query(Exercise).filter(Exercise.workout_id == workout.id).all()
            
            # Delete all sets for all exercises (use DBSetLog not Set)
            for exercise in exercises:
                db.query(DBSetLog).filter(DBSetLog.exercise_id == exercise.id).delete()
            
            # Delete all exercises
            db.query(Exercise).filter(Exercise.workout_id == workout.id).delete()
            
            # Delete the workout
            db.delete(workout)
            db.commit()
            return True, f"Workout '{workout_type}' deleted successfully"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()
