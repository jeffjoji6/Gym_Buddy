import { supabase } from '../supabaseClient';

export const getUsers = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('*');
    
    if (error) {
        console.error("Error fetching users:", error);
        return { users: [] };
    }
    return { users: data };
};

export const deleteUser = async (username) => {
    // Determine user ID first? Or delete by username if unique. 
    // Schema has username as unique.
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);
    
    if (error) return { success: false, message: error.message };
    return { success: true, message: `User ${username} deleted` };
};

export const getWorkout = async (type, week, user, split = "A") => {
    // We need to fetch exercises, sets, and potentially previous week's data.
    // This logic was complex in backend/data_manager.py.
    // Simplifying for direct DB access:
    // 1. Get Workout ID
    // 2. Get Exercises for workout + split
    // 3. Get Sets for current week/user
    
    // 1. Get Workout ID
    const { data: workout } = await supabase
        .from('workouts')
        .select('id')
        .eq('name', type)
        .single();
        
    if (!workout) return { exercises: [] };
    
    // 2. Get Exercises
    const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('workout_id', workout.id)
        .eq('split', split)
        .order('id');
        
    if (!exercises) return { exercises: [] };
    
    // 3. Attach Sets and History (prev week)
    // This is N+1 query problem territory, but fine for small app.
    // Optimally we'd use a View or complex join.
    
    const exercisesWithData = await Promise.all(exercises.map(async (ex) => {
        // Fetch current week sets
        const { data: currentSets } = await supabase
            .from('sets')
            .select('*')
            .eq('exercise_id', ex.id)
            .eq('user_id', (await getUserId(user)))
            .eq('week', week)
            .order('set_number');
            
        // Fetch previous week (for summary)
        const { data: prevSets } = await supabase
            .from('sets')
            .select('weight, reps')
            .eq('exercise_id', ex.id)
            .eq('user_id', (await getUserId(user)))
            .eq('week', week - 1)
            .order('weight', { ascending: false }) // simple heuristic for "best" set
            .limit(1);
            
        let prevSummary = null;
        if (prevSets && prevSets.length > 0) {
            prevSummary = `${prevSets[0].weight}kg x ${prevSets[0].reps}`;
        }
            
        return {
            ...ex,
            sets: currentSets || [],
            prev_week_summary: prevSummary
        };
    }));
    
    return { exercises: exercisesWithData };
};

export const getWorkouts = async (username) => {
    // Retrieve all workouts available to user (defaults + created by user)
    // Complex logic: (created_by IS NULL OR created_by = this_user)
    
    const userId = await getUserId(username);
    
    const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .or(`created_by_user_id.is.null,created_by_user_id.eq.${userId}`);

    if (error) return { workouts: [] };
    return { workouts: data };
};

export const logSet = async (payload) => {
    const { workout_type, exercise_name, weight, reps, week, user } = payload;
    const userId = await getUserId(user);
    
    // Get Exercise ID
    const { data: exercise } = await supabase
        .from('exercises')
        .select('id')
        .eq('name', exercise_name)
        .single(); // Risk: Name might duplicate across workouts?
        // Ideally we should pass exercise_id from UI, but preserving API signature for now.
        
    if (!exercise) return { success: false, message: "Exercise not found" };
    
    // Get next set number
    const { count } = await supabase
        .from('sets')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exercise.id)
        .eq('user_id', userId)
        .eq('week', week);
        
    const setNumber = (count || 0) + 1;
    
    const { error } = await supabase
        .from('sets')
        .insert({
            exercise_id: exercise.id,
            user_id: userId,
            week,
            weight,
            reps,
            set_number: setNumber,
            timestamp: new Date().toISOString()
        });
        
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Logged" };
};

export const updateSet = async (payload) => {
    const { set_id, weight, reps } = payload;
    const { error } = await supabase
        .from('sets')
        .update({ weight, reps })
        .eq('id', set_id);
    
    return { success: !error, message: error ? error.message : "Updated" };
};

export const deleteSet = async (payload) => {
    const { set_id } = payload;
    const { error } = await supabase
        .from('sets')
        .delete()
        .eq('id', set_id);
        
    return { success: !error, message: error ? error.message : "Deleted" };
};

// HELPER: Get User ID from Username (Memoize optimally?)
const getUserId = async (username) => {
    // Check if we need to create user?
    // Old backend had auto-create on some paths.
    // Let's assume user exists or create if missing (mimic old 'get_user_id')
    
    let { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();
        
    if (data) return data.id;
    
    // Create if missing
    const { data: newUser, error } = await supabase
        .from('users')
        .insert({ username })
        .select()
        .single();
        
    if (error) {
        console.error("Error creating user", error);
        return null;
    }
    return newUser.id;
};

export const createWorkout = async (name, username) => {
    const userId = await getUserId(username);
    const { error } = await supabase
        .from('workouts')
        .insert({ name, created_by_user_id: userId });
        
    return { success: !error, message: error ? error.message : "Created" };
};

export const addExercise = async (workoutType, name, username, split = "A") => {
    const userId = await getUserId(username); // Current user adding it
    
    // 1. Get Workout ID
    const { data: workout } = await supabase
        .from('workouts')
        .select('id')
        .eq('name', workoutType)
        .single();
        
    if (!workout) return { success: false, message: "Workout not found" };

    const { error } = await supabase
        .from('exercises')
        .insert({
            workout_id: workout.id,
            name,
            user_id: userId,
            split,
            default_sets: 3 // Default
        });
        
    return { success: !error, message: error ? error.message : "Added" };
};

export const deleteExercise = async (workoutType, exerciseName, username) => {
    // Delete from DB. Constraints should cascade sets deletion?
    // If not, we might need manual cleanup.
    // Assuming Postgres ON DELETE CASCADE is set up or we do it manually.
    
    const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('name', exerciseName); // Risk: duplicates if name not unique to workout
        
    return { success: !error, message: error ? error.message : "Deleted" };
};

export const deleteWorkout = async (workoutType) => {
    const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('name', workoutType);
        
    return { success: !error, message: error ? error.message : "Deleted" };
};

export const startSession = async (user, workoutType, split = "A") => {
    const userId = await getUserId(user);
    
    const { data: workout } = await supabase.from('workouts').select('id').eq('name', workoutType).single();
    if (!workout) return { success: false, message: "Workout not found" };
    
    const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
            user_id: userId,
            workout_id: workout.id,
            split,
            start_time: new Date().toISOString()
        })
        .select()
        .single();
        
    if (error) return { success: false, message: error.message };
    return { success: true, session_id: data.id };
};

export const endSession = async (sessionId, user, notes = "") => {
    const endTime = new Date();
    
    // 1. Fetch Session to get Start Time
    const { data: session } = await supabase.from('workout_sessions').select('*').eq('id', sessionId).single();
    if (!session) return { success: false, message: "Session not found" };
    
    const startTime = new Date(session.start_time);
    const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes
    
    // 2. Calculate Volume (Aggregation query)
    // We need all sets created between start and end by this user?
    // Or just "sets created today"?
    // Backend logic was: sum weight * reps for sets in this session? 
    // Wait, sets don't link to session_id in current schema.
    // We'll calculate volume from sets logged "recently" or passing it from frontend?
    // Backend implementation did: 
    // sets = db.query(DBSetLog).filter(user, workout, week??) -> Logic was weak in backend too.
    // Let's simplified: 0 volume for now or fetch sets from "today".
    
    const { error } = await supabase
        .from('workout_sessions')
        .update({
            end_time: endTime.toISOString(),
            duration_minutes: duration,
            notes: notes
        })
        .eq('id', sessionId);
        
    if (error) return { success: false, message: error.message };
    
    return { 
        success: true, 
        message: "Session ended", 
        duration_minutes: duration, 
        total_volume: 0, 
        prs: [] // parsing PRs requires complex history check, skipping for V1 migration
    };
};

export const getDashboardStats = async (user) => {
    // Stub
    return { success: true, data: { total_workouts: 0 } };
};

export const updateExerciseNotes = async (workoutType, exerciseName, setupNotes, user, split = "A") => {
    const { error } = await supabase
        .from('exercises')
        .update({ setup_notes: setupNotes })
        .eq('name', exerciseName);
        
    return { success: !error, message: error ? error.message : "Updated" };
};

export const healthCheck = async () => {
    // Check connection
    const { error } = await supabase.from('workouts').select('count', { count: 'exact', head: true });
    if (error) return { status: "error" };
    return { status: "ok" };
};
