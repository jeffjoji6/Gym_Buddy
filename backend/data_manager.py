from .database import SessionLocal
from .models_db import User, Workout, Exercise, SetLog as DBSetLog, WorkoutSession
from .models import Exercise as APIExercise, SetLog as APISetLog, UserSchema
from fuzzywuzzy import process
from sqlalchemy.orm import joinedload
from sqlalchemy import func, desc, extract
from datetime import datetime, timedelta

class DataManager:
    def __init__(self):
        pass

    def get_db(self):
        return SessionLocal()

    def get_user_info(self, username: str):
        db = self.get_db()
        try:
            user = self.ensure_user(db, username)
            return {"id": user.id, "username": user.username, "is_admin": bool(user.is_admin)}
        finally:
            db.close()

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

    def get_workouts(self, username: str = None):
        db = self.get_db()
        try:
            query = db.query(Workout)
            if username:
                user = self.ensure_user(db, username)
                # Show workouts created by this user OR by Admins (Global)
                # Or workouts with no creator (legacy/global)
                
                # Subquery to find admins? Or just join?
                # Simpler: Filter where created_by_user_id is None (System) 
                # OR created_by_user_id == user.id 
                # OR created_by_user_id IN (select id from users where is_admin=1)
                
                admin_ids = db.query(User.id).filter(User.is_admin == 1).all()
                admin_ids = [a[0] for a in admin_ids]
                
                query = query.filter(
                    (Workout.created_by_user_id == None) | 
                    (Workout.created_by_user_id == user.id) |
                    (Workout.created_by_user_id.in_(admin_ids))
                )
            
            workouts = query.all()
            # Return dict with metadata
            return [
                {
                    "name": w.name, 
                    "is_global": (w.created_by_user_id is None or w.created_by_user_id in admin_ids),
                    "created_by": w.created_by_user_id
                } 
                for w in workouts
            ]
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
                    prev_week_summary=prev_summary,
                    setup_notes=ex.setup_notes
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

    def create_workout(self, name: str, username: str = None):
        db = self.get_db()
        try:
            existing = db.query(Workout).filter(Workout.name == name).first()
            if existing:
                return False, f"Workout '{name}' already exists"
            
            creator_id = None
            if username:
                user = self.ensure_user(db, username)
                creator_id = user.id

            workout = Workout(name=name, created_by_user_id=creator_id)
            db.add(workout)
            db.commit()
            return True, f"Workout '{name}' created"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def add_exercise(self, workout_type: str, name: str, default_sets: int = 3, username: str = None, split: str = "A", setup_notes: str = None):
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
                split=split,
                setup_notes=setup_notes
            )
            db.add(exercise)
            db.commit()
            return True, f"Added '{name}' to {workout_type}"
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def update_exercise_notes(self, workout_type: str, exercise_name: str, setup_notes: str, username: str = None, split: str = "A"):
        """Update setup notes for an exercise"""
        db = self.get_db()
        try:
            workout = db.query(Workout).filter(Workout.name == workout_type).first()
            if not workout:
                return False, "Workout type not found"
            
            exercise = db.query(Exercise).filter(
                Exercise.workout_id == workout.id,
                Exercise.name == exercise_name,
                Exercise.split == split
            ).first()
            
            if not exercise:
                return False, f"Exercise '{exercise_name}' not found"
            
            exercise.setup_notes = setup_notes
            db.commit()
            return True, "Notes updated successfully"
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

    def start_session(self, username: str, workout_type: str, split: str = "A"):
        db = self.get_db()
        try:
            user = self.ensure_user(db, username)
            workout = db.query(Workout).filter(Workout.name == workout_type).first()
            
            # Start session
            session = WorkoutSession(
                user_id=user.id,
                workout_id=workout.id if workout else None, # Allow null if workout type deleted
                split=split,
                start_time=datetime.utcnow()
            )
            db.add(session)
            db.commit()
            db.refresh(session)
            return True, session.id
        except Exception as e:
            db.rollback()
            return False, str(e)
        finally:
            db.close()

    def end_session(self, session_id: int, username: str, notes: str = None):
        db = self.get_db()
        try:
            user = self.ensure_user(db, username)
            session = db.query(WorkoutSession).filter(WorkoutSession.id == session_id, WorkoutSession.user_id == user.id).first()
            
            if not session:
                return False, "Session not found", None, None, []
                
            session.end_time = datetime.utcnow()
            session.notes = notes
            
            # Calculate duration
            duration_minutes = int((session.end_time - session.start_time).total_seconds() / 60)
            
            # Calculate volume & Check PRs
            # 1. Get all sets created during this session window by this user for the workout 
            # (Approximation since we didn't link sets to session yet, using time window + user + workout)
            
            # Ideally frontend passes sets or we link them. 
            # For now, let's look for sets logged AFTER start_time by this user
            
            sets_in_window = db.query(DBSetLog).filter(
                DBSetLog.user_id == user.id,
                DBSetLog.timestamp >= session.start_time,
                DBSetLog.timestamp <= session.end_time
            ).all()

            total_volume = 0
            prs = []
            
            # Group by exercise to check max
            exercise_maxes = {} 
            
            for s in sets_in_window:
                vol = s.weight * s.reps
                total_volume += vol
                
                if s.exercise_id not in exercise_maxes:
                    exercise_maxes[s.exercise_id] = {'max_weight': 0, 'max_reps_at_weight': 0, 'obj': s}
                
                curr = exercise_maxes[s.exercise_id]
                if s.weight > curr['max_weight']:
                    curr['max_weight'] = s.weight
                    curr['max_reps_at_weight'] = s.reps
                elif s.weight == curr['max_weight'] and s.reps > curr['max_reps_at_weight']:
                    curr['max_reps_at_weight'] = s.reps

            session.total_volume = total_volume
            
            # Check against legacy history (sets BEFORE session start)
            for ex_id, data in exercise_maxes.items():
                # Find max weight ever lifted before this session
                history = db.query(func.max(DBSetLog.weight)).filter(
                    DBSetLog.user_id == user.id,
                    DBSetLog.exercise_id == ex_id,
                    DBSetLog.timestamp < session.start_time
                ).scalar()
                
                prev_max = history if history else 0
                
                exercise_name = data['obj'].exercise.name
                
                if data['max_weight'] > prev_max:
                    prs.append(f"New PR on {exercise_name}: {data['max_weight']}kg x {data['max_reps_at_weight']}")
                    
            # Save PR details
            pr_exercise_names = [p.split(":")[0].replace("New PR on ", "") for p in prs]
            session.pr_details = ", ".join(pr_exercise_names)
            session.pr_count = len(prs)
            
            db.commit()
            return True, "Session ended", duration_minutes, total_volume, prs
            
        except Exception as e:
            db.rollback()
            return False, str(e), None, None, None
        finally:
            db.close()

    def get_user_stats(self, username: str):
        db = self.get_db()
        try:
            user = self.ensure_user(db, username)
            
            # 1. This Week's Stats
            today = datetime.utcnow()
            start_of_week = today - timedelta(days=today.weekday())
            start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
            
            sessions_this_week = db.query(WorkoutSession).filter(
                WorkoutSession.user_id == user.id,
                WorkoutSession.start_time >= start_of_week
            ).all()
            
            workouts_this_week = len(sessions_this_week)
            prs_this_week = sum(s.pr_count for s in sessions_this_week if s.pr_count)
                
            # 2. Recent Activity
            recent_sessions = db.query(WorkoutSession).options(joinedload(WorkoutSession.workout)).filter(
                WorkoutSession.user_id == user.id
            ).order_by(desc(WorkoutSession.start_time)).limit(5).all()
            
            activity = []
            for s in recent_sessions:
                workout_name = s.workout.name if s.workout else "Unknown"
                if s.split:
                    workout_name += f" ({s.split})"
                    
                activity.append({
                    "date": s.start_time.isoformat(), 
                    "workout": workout_name,
                    "duration": int((s.end_time - s.start_time).total_seconds() / 60) if s.end_time and s.start_time else 0,
                    "volume": s.total_volume,
                    "pr_count": s.pr_count or 0,
                    "pr_details": s.pr_details if s.pr_count and s.pr_details else None
                })
                
            return True, {
                "workouts_this_week": workouts_this_week,
                "prs_this_week": prs_this_week,
                "recent_activity": activity
            }
            
        except Exception as e:
            return False, str(e)
        finally:
            db.close()
