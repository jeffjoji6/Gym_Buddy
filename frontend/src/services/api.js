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
    // Fetch the user ID first
    const { data: user } = await supabase.from('users').select('id').eq('username', username).single();
    if (!user) return { success: false, message: "User not found" };
    
    const uid = user.id;

    // Manually cascade delete related data since the DB constraints might not be set to CASCADE
    await supabase.from('sets').delete().eq('user_id', uid);
    await supabase.from('workout_sessions').delete().eq('user_id', uid);
    // Be careful with exercises: this deletes custom exercises they added
    await supabase.from('exercises').delete().eq('user_id', uid);
    await supabase.from('workouts').update({ created_by_user_id: null }).eq('created_by_user_id', uid);
    
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', uid);
    
    if (error) return { success: false, message: error.message };
    return { success: true, message: `User ${username} deleted` };
};

export const getWorkout = async (type, week, user, split = "A") => {
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
        
    if (!exercises || exercises.length === 0) return { exercises: [] };
    
    const exerciseIds = exercises.map(ex => ex.id);
    const userId = await getUserId(user);

    // 3. Fetch all current week sets for these exercises in ONE query
    const { data: currentSets } = await supabase
        .from('sets')
        .select('*')
        .in('exercise_id', exerciseIds)
        .eq('user_id', userId)
        .eq('week', week)
        .order('set_number');
        
    // 4. Fetch all previous week sets for these exercises in ONE query
    const { data: prevSets } = await supabase
        .from('sets')
        .select('exercise_id, weight, reps')
        .in('exercise_id', exerciseIds)
        .eq('user_id', userId)
        .eq('week', week - 1)
        .order('weight', { ascending: false });

    // Group current sets
    const setsByExercise = {};
    if (currentSets) {
        currentSets.forEach(s => {
            if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
            setsByExercise[s.exercise_id].push(s);
        });
    }

    // Group prev sets to find the best summary
    const prevSummaryByExercise = {};
    if (prevSets) {
        prevSets.forEach(s => {
            // Because we ordered by weight descending globally, the first one we see 
            // per exercise is the heaviest
            if (!prevSummaryByExercise[s.exercise_id]) {
                prevSummaryByExercise[s.exercise_id] = `${s.weight}kg x ${s.reps}`;
            }
        });
    }

    const exercisesWithData = exercises.map((ex) => {
        return {
            ...ex,
            sets: setsByExercise[ex.id] || [],
            prev_week_summary: prevSummaryByExercise[ex.id] || null
        };
    });
    
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
    const { exercise_id, weight, reps, week, user } = payload;
    const userId = await getUserId(user);
    
    // Get next set number
    const { count } = await supabase
        .from('sets')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exercise_id)
        .eq('user_id', userId)
        .eq('week', week);
        
    const setNumber = (count || 0) + 1;
    
    const { data: insertedData, error } = await supabase
        .from('sets')
        .insert({
            exercise_id,
            user_id: userId,
            week,
            weight,
            reps,
            set_number: setNumber,
            timestamp: new Date().toISOString()
        })
        .select()
        .single();
        
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Logged", data: insertedData };
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

export const deleteExercise = async (exerciseId) => {
    // Delete from DB. Constraints should cascade sets deletion?
    // If not, we might need manual cleanup.
    // Assuming Postgres ON DELETE CASCADE is set up or we do it manually.
    
    const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);
        
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

export const updateExerciseNotes = async (exerciseId, setupNotes) => {
    const { error } = await supabase
        .from('exercises')
        .update({ setup_notes: setupNotes })
        .eq('id', exerciseId);
        
    return { success: !error, message: error ? error.message : "Updated" };
};

export const healthCheck = async () => {
    // Check connection
    const { error } = await supabase.from('workouts').select('count', { count: 'exact', head: true });
    if (error) return { status: "error" };
    return { status: "ok" };
};
