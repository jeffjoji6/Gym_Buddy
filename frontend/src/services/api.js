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
        .order('set_number', { ascending: true });

    // Group current sets
    const setsByExercise = {};
    if (currentSets) {
        currentSets.forEach(s => {
            if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
            setsByExercise[s.exercise_id].push(s);
        });
    }

    // Group prev sets 
    const prevSetsByExercise = {};
    if (prevSets) {
        prevSets.forEach(s => {
            if (!prevSetsByExercise[s.exercise_id]) prevSetsByExercise[s.exercise_id] = [];
            prevSetsByExercise[s.exercise_id].push(s);
        });
    }

    // 5. Fetch per-user setup notes from exercise_notes table
    const { data: userNotes } = await supabase
        .from('exercise_notes')
        .select('exercise_id, notes')
        .in('exercise_id', exerciseIds)
        .eq('user_id', userId);

    const notesByExercise = {};
    if (userNotes) {
        userNotes.forEach(n => { notesByExercise[n.exercise_id] = n.notes; });
    }

    const exercisesWithData = exercises.map((ex) => {
        return {
            ...ex,
            sets: setsByExercise[ex.id] || [],
            prev_week_sets: prevSetsByExercise[ex.id] || [],
            setup_notes: notesByExercise[ex.id] ?? ex.setup_notes ?? ''
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

export const endSession = async (sessionId, user, notes = "", totalVolume = 0) => {
    const endTime = new Date();
    
    // 1. Fetch Session to get Start Time
    const { data: session } = await supabase.from('workout_sessions').select('*').eq('id', sessionId).single();
    if (!session) return { success: false, message: "Session not found" };
    
    const startTime = new Date(session.start_time);
    const duration = Math.round((endTime - startTime) / 1000 / 60); // minutes
    
    // 2. Calculate Volume (Aggregation query)
    // Passed directly from frontend now to save complex DB joins
    
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
        total_volume: totalVolume, 
        prs: [] // parsing PRs requires complex history check, skipping for V1 migration
    };
};

export const getDashboardStats = async (user) => {
    try {
        const userId = await getUserId(user);
        if (!userId) return { success: false };

        // Get all workout names for mapping
        const { data: allWorkouts } = await supabase
            .from('workouts')
            .select('id, name');
        
        const workoutNameMap = {};
        if (allWorkouts) {
            allWorkouts.forEach(w => { workoutNameMap[w.id] = w.name; });
        }

        // Get exercise names for PR details
        const { data: allExercises } = await supabase
            .from('exercises')
            .select('id, name');
        const exerciseNameMap = {};
        if (allExercises) {
            allExercises.forEach(e => { exerciseNameMap[e.id] = e.name; });
        }

        // Get ALL sessions — INCLUDING ones where user forgot to end (end_time = null)
        const { data: allSessions } = await supabase
            .from('workout_sessions')
            .select('id, start_time, end_time, workout_id, duration_minutes')
            .eq('user_id', userId)
            .order('start_time', { ascending: false });

        let sessions = allSessions || [];

        // Compute real duration; for sessions with no end_time, treat them as valid (duration 0 shown)
        // Filter out pure misclicks — only when we CAN compute duration and it's < 2 min
        sessions = sessions.map(s => {
            if (!s.end_time) {
                return { ...s, realDuration: 0 }; // valid session, duration unknown
            }
            const rawDur = Math.round((new Date(s.end_time) - new Date(s.start_time)) / 60000);
            return { ...s, realDuration: Math.min(rawDur, 180) }; // Cap display at 3 hours
        }).filter(s => {
            // Drop misclicks: only if we have an end_time AND it's under 2 minutes
            if (s.end_time) {
                const rawDur = Math.round((new Date(s.end_time) - new Date(s.start_time)) / 60000);
                return rawDur >= 2;
            }
            return true; // Keep all sessions with no end_time
        });

        // Calculate dynamic Active Week based on first session
        let calculatedActiveWeek = 1;
        if (sessions.length > 0) {
            // sessions is ordered descending by start_time, so last item is the first session ever
            const firstSession = sessions[sessions.length - 1];
            const firstDate = new Date(firstSession.start_time);
            firstDate.setHours(0, 0, 0, 0); // Normalize to start of day
            const now = new Date();
            const diffTime = Math.abs(now - firstDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            calculatedActiveWeek = Math.floor(diffDays / 7) + 1;
        }

        // Workouts this week (Mon-Sun)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        monday.setHours(0, 0, 0, 0);

        const sessionsThisWeek = sessions.filter(s => new Date(s.start_time) >= monday);
        const workoutsThisWeek = sessionsThisWeek.length;

        // Weekly heatmap (Mon=0 ... Sun=6)
        const weeklyHeatmap = [0, 0, 0, 0, 0, 0, 0];
        sessionsThisWeek.forEach(s => {
            const d = new Date(s.start_time).getDay();
            const idx = d === 0 ? 6 : d - 1;
            weeklyHeatmap[idx]++;
        });

        // Streak
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkDate = new Date(today);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        const hasToday = sessions.some(s => {
            const d = new Date(s.start_time);
            return d >= today && d <= todayEnd;
        });
        if (!hasToday) checkDate.setDate(checkDate.getDate() - 1);
        for (let i = 0; i < 365; i++) {
            const dayStart = new Date(checkDate);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(checkDate);
            dayEnd.setHours(23, 59, 59, 999);
            if (sessions.some(s => { const d = new Date(s.start_time); return d >= dayStart && d <= dayEnd; })) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else break;
        }

        // Get ALL sets for this user (for volume + PRs)
        const { data: allSets } = await supabase
            .from('sets')
            .select('exercise_id, weight, reps, week, timestamp')
            .eq('user_id', userId);

        const sets = allSets || [];

        // Total volume this week (FIXED: use 'timestamp' not 'created_at')
        let totalVolumeThisWeek = 0;
        sets.forEach(s => {
            if (s.timestamp && new Date(s.timestamp) >= monday) {
                totalVolumeThisWeek += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
            }
        });

        // Current week number (from URL context — approximate using the latest week in sets)
        // For PRs: compare each exercise's max this week vs all-time previous max
        const currentWeek = (() => {
            const weekNums = sets.map(s => s.week).filter(w => w != null);
            return weekNums.length > 0 ? Math.max(...weekNums) : 1;
        })();

        // Group sets by exercise
        const setsByExercise = {};
        sets.forEach(s => {
            if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
            setsByExercise[s.exercise_id].push(s);
        });

        // Compute PRs this week
        let prsThisWeek = 0;
        const prDetailsList = [];
        Object.entries(setsByExercise).forEach(([exId, exSets]) => {
            const thisWeekSets = exSets.filter(s => s.week === currentWeek);
            const prevWeekSets = exSets.filter(s => s.week < currentWeek);
            
            if (thisWeekSets.length === 0 || prevWeekSets.length === 0) return;
            
            const thisWeekMax = Math.max(...thisWeekSets.map(s => parseFloat(s.weight) || 0));
            const prevMax = Math.max(...prevWeekSets.map(s => parseFloat(s.weight) || 0));
            
            if (thisWeekMax > prevMax) {
                prsThisWeek++;
                const name = exerciseNameMap[parseInt(exId)] || 'Exercise';
                prDetailsList.push(`${name}: ${thisWeekMax}kg`);
            }
        });
        const recentActivity = sessions.slice(0, 10).map(s => ({
            date: s.start_time,
            workout: workoutNameMap[s.workout_id] || 'Workout',
            duration: s.realDuration,
            pr_count: 0,
            pr_details: null
        }));

        return {
            success: true,
            data: {
                calculated_active_week: calculatedActiveWeek,
                workouts_this_week: workoutsThisWeek,
                total_volume_this_week: totalVolumeThisWeek,
                streak,
                total_sessions: sessions.length,
                weekly_heatmap: weeklyHeatmap,
                prs_this_week: prsThisWeek,
                pr_details_list: prDetailsList,
                recent_activity: recentActivity
            }
        };
    } catch(e) {
        console.error('getDashboardStats error', e);
        return { success: false };
    }
};

// Progress graph data: max weight per week per exercise
export const getProgressData = async (user) => {
    try {
        const userId = await getUserId(user);
        if (!userId) return { success: false };

        const { data: allSets } = await supabase
            .from('sets')
            .select('exercise_id, weight, week')
            .eq('user_id', userId);

        const { data: allExercises } = await supabase
            .from('exercises')
            .select('id, name');

        const exerciseNameMap = {};
        if (allExercises) {
            allExercises.forEach(e => { exerciseNameMap[e.id] = e.name; });
        }

        // Group by exercise -> week -> max weight
        const progressMap = {}; // { exerciseId: { week: maxWeight } }
        const exercisesWithData = new Set();

        (allSets || []).forEach(s => {
            const exId = s.exercise_id;
            const w = s.weight ? parseFloat(s.weight) : 0;
            if (!progressMap[exId]) progressMap[exId] = {};
            if (!progressMap[exId][s.week] || w > progressMap[exId][s.week]) {
                progressMap[exId][s.week] = w;
            }
            exercisesWithData.add(exId);
        });

        // Build exercise list with names
        const exerciseList = Array.from(exercisesWithData).map(id => ({
            id: parseInt(id),
            name: exerciseNameMap[parseInt(id)] || `Exercise ${id}`
        })).sort((a, b) => a.name.localeCompare(b.name));

        // Build progress series for each exercise
        const progressSeries = {};
        Object.entries(progressMap).forEach(([exId, weekData]) => {
            const weeks = Object.keys(weekData).map(Number).sort((a, b) => a - b);
            progressSeries[exId] = weeks.map(w => ({ week: w, maxWeight: weekData[w] }));
        });

        return {
            success: true,
            data: { exerciseList, progressSeries }
        };
    } catch (e) {
        console.error('getProgressData error', e);
        return { success: false };
    }
};

export const updateExerciseNotes = async (exerciseId, setupNotes, user) => {
    const userId = await getUserId(user);
    if (!userId) return { success: false, message: 'User not found' };

    const { error } = await supabase
        .from('exercise_notes')
        .upsert(
            { exercise_id: exerciseId, user_id: userId, notes: setupNotes, updated_at: new Date().toISOString() },
            { onConflict: 'exercise_id,user_id' }
        );
        
    return { success: !error, message: error ? error.message : "Updated" };
};

export const getUserProfile = async (user) => {
    const userId = await getUserId(user);
    if (!userId) return null;
    
    const { data } = await supabase
        .from('users')
        .select('height_cm, weight_kg, age, gender')
        .eq('id', userId)
        .single();
    
    return data;
};

export const updateUserProfile = async (user, profileData) => {
    const userId = await getUserId(user);
    if (!userId) return { success: false };
    
    const { error } = await supabase
        .from('users')
        .update(profileData)
        .eq('id', userId);
    
    return { success: !error, message: error ? error.message : 'Updated' };
};

export const healthCheck = async () => {
    // Check connection
    const { error } = await supabase.from('workouts').select('count', { count: 'exact', head: true });
    if (error) return { status: "error" };
    return { status: "ok" };
};
