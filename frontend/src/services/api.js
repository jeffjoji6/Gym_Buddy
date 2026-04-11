import { supabase } from '../supabaseClient';

const OFFLINE_QUEUE_KEY = 'gym_buddy_offline_queue';

const addToOfflineQueue = (action, payload) => {
    try {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        queue.push({ action, payload, timestamp: Date.now() });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Failed to queue offline action', e);
    }
};

export const syncOfflineQueue = async () => {
    if (!navigator.onLine) return;
    
    try {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
        if (queue.length === 0) return;
        
        let successCount = 0;
        let failedQueue = [];

        for (const item of queue) {
            let res;
            switch(item.action) {
                case 'logSet': res = await logSet(item.payload, true); break;
                case 'updateSet': res = await updateSet(item.payload, true); break;
                case 'deleteSet': res = await deleteSet(item.payload, true); break;
                case 'addExercise': res = await addExercise(item.payload.workoutType, item.payload.name, item.payload.username, item.payload.split, true); break;
                case 'deleteExercise': res = await deleteExercise(item.payload.exerciseId, true); break;
                case 'updateExerciseNotes': res = await updateExerciseNotes(item.payload.exerciseId, item.payload.setupNotes, item.payload.user, true); break;
            }
            if (res && res.success) {
                successCount++;
            } else {
                failedQueue.push(item);
            }
        }
        
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failedQueue));
        
        if (successCount > 0) {
            window.dispatchEvent(new CustomEvent('offlineSyncComplete', { detail: { count: successCount } }));
        }
    } catch (e) {
        console.error('Failed to sync offline queue', e);
    }
};

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

export const getWorkout = async (type, dateStr, user, split = "A") => {
    // 1. Get Workout ID
    const { data: workout } = await supabase
        .from('workouts')
        .select('id')
        .eq('name', type)
        .single();
        
    if (!workout) return { exercises: [] };
    
    // 2. Get Exercises — include exercises matching the split OR with no split set (NULL)
    const { data: exercises } = await supabase
        .from('exercises')
        .select('*')
        .eq('workout_id', workout.id)
        .or(`split.eq.${split},split.is.null`)
        .order('id');
        
    if (!exercises || exercises.length === 0) return { exercises: [] };
    
    const exerciseIds = exercises.map(ex => ex.id);
    const userId = await getUserId(user);

    // Calculate local Day ranges
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    // 3. Fetch all current day sets for these exercises
    const { data: currentSets } = await supabase
        .from('sets')
        .select('*')
        .in('exercise_id', exerciseIds)
        .eq('user_id', userId)
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString())
        .order('timestamp', { ascending: true }); // using timestamp to order sets natively
        
    // 4. Fetch all previous sets older than current day to find "prev_week_sets" (most recent previous session per exercise)
    const { data: allPrevSets } = await supabase
        .from('sets')
        .select('exercise_id, weight, reps, timestamp')
        .in('exercise_id', exerciseIds)
        .eq('user_id', userId)
        .lt('timestamp', startOfDay.toISOString())
        .order('timestamp', { ascending: false });

    // Group current sets
    const setsByExercise = {};
    if (currentSets) {
        currentSets.forEach(s => {
            if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
            setsByExercise[s.exercise_id].push(s);
        });
    }

    // Group previous sets optimally (find most recent recorded day per exercise)
    const prevSetsByExercise = {};
    if (allPrevSets) {
        const getLocalDay = (iso) => {
            const d = new Date(iso);
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        };
        
        allPrevSets.forEach(s => {
            const day = getLocalDay(s.timestamp);
            if (!prevSetsByExercise[s.exercise_id]) {
                prevSetsByExercise[s.exercise_id] = { day, sets: [] };
            }
            if (prevSetsByExercise[s.exercise_id].day === day) {
                prevSetsByExercise[s.exercise_id].sets.push(s);
            }
        });
        
        // Reverse them so they are chronological (1st set, 2nd set...)
        Object.keys(prevSetsByExercise).forEach(k => {
            prevSetsByExercise[k].sets.reverse();
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
            prev_week_sets: prevSetsByExercise[ex.id]?.sets || [],
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

export const logSet = async (payload, isSyncing = false) => {
    if (!navigator.onLine && !isSyncing) {
        addToOfflineQueue('logSet', payload);
        return { success: true, message: "Queued offline", data: { id: `offline_${Date.now()}`, ...payload } };
    }
    const { exercise_id, weight, reps, date, user } = payload;
    const userId = await getUserId(user);

    // Merge realistic timestamp matching the 'date' assigned by user
    // If date is today, use accurate Date.now(), else use midnight of date.
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    let finalTimestamp;
    if (date === todayStr) {
        finalTimestamp = now.toISOString();
    } else {
        const d = new Date(date);
        d.setHours(12, 0, 0, 0); // Noon
        finalTimestamp = d.toISOString();
    }
    
    // Get next set number for context continuity
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { count } = await supabase
        .from('sets')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exercise_id)
        .eq('user_id', userId)
        .gte('timestamp', startOfDay.toISOString())
        .lte('timestamp', endOfDay.toISOString());
        
    const setNumber = (count || 0) + 1;
    
    const { data: insertedData, error } = await supabase
        .from('sets')
        .insert({
            exercise_id,
            user_id: userId,
            week: null, // Deprecated
            weight,
            reps,
            set_number: setNumber,
            timestamp: finalTimestamp
        })
        .select()
        .single();
        
    if (error) return { success: false, message: error.message };
    return { success: true, message: "Logged", data: insertedData };
};

export const updateSet = async (payload, isSyncing = false) => {
    if (!navigator.onLine && !isSyncing) {
        addToOfflineQueue('updateSet', payload);
        return { success: true, message: "Queued offline" };
    }
    const { set_id, weight, reps } = payload;
    const { error } = await supabase
        .from('sets')
        .update({ weight, reps })
        .eq('id', set_id);
    
    return { success: !error, message: error ? error.message : "Updated" };
};

export const deleteSet = async (payload, isSyncing = false) => {
    if (!navigator.onLine && !isSyncing) {
        addToOfflineQueue('deleteSet', payload);
        return { success: true, message: "Queued offline" };
    }
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

export const addExercise = async (workoutType, name, username, split = "A", isSyncing = false) => {
    if (!navigator.onLine && !isSyncing) {
        addToOfflineQueue('addExercise', { workoutType, name, username, split });
        return { success: true, message: "Queued offline", data: { id: `offline_${Date.now()}` } };
    }
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

export const deleteExercise = async (exerciseId, isSyncing = false) => {
    if (!navigator.onLine && !isSyncing) {
        addToOfflineQueue('deleteExercise', { exerciseId });
        return { success: true, message: "Queued offline" };
    }
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



export const getDashboardStats = async (user, weekOffset = 0) => {
    try {
        const userId = await getUserId(user);
        if (!userId) return { success: false };

        // 1. Fetch reference maps: Workouts & Exercises
        const { data: allWorkouts } = await supabase.from('workouts').select('id, name');
        const workoutNameMap = {};
        if (allWorkouts) allWorkouts.forEach(w => { workoutNameMap[w.id] = w.name; });

        const { data: allExercises } = await supabase.from('exercises').select('id, name, workout_id');
        const exerciseNameMap = {};
        const exerciseWorkoutMap = {};
        if (allExercises) {
            allExercises.forEach(e => {
                exerciseNameMap[e.id] = e.name;
                exerciseWorkoutMap[e.id] = e.workout_id;
            });
        }

        // 2. Get ALL sets for this user
        const { data: allSets } = await supabase
            .from('sets')
            .select('exercise_id, weight, reps, week, timestamp')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        let sets = allSets || [];
        // Filter out any anomalous sets without a timestamp
        sets = sets.filter(s => s.timestamp);

        // 3. Group Sets by Local Day String (YYYY-MM-DD) to form implicit "sessions"
        const dayMap = {}; // { '2023-10-01': { date: Date, volume: 0, sets: [], mainWorkoutId: null } }
        
        sets.forEach(s => {
            const d = new Date(s.timestamp);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (!dayMap[dateStr]) {
                dayMap[dateStr] = { date: d, volume: 0, sets: [], workoutCounts: {} };
            }
            
            const vol = (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
            dayMap[dateStr].volume += vol;
            dayMap[dateStr].sets.push(s);
            
            // Map set back to its workout family
            const wId = exerciseWorkoutMap[s.exercise_id];
            if (wId) {
                dayMap[dateStr].workoutCounts[wId] = (dayMap[dateStr].workoutCounts[wId] || 0) + 1;
            }
        });

        // 4. Derive summary list of Active Days
        const activeDays = Object.keys(dayMap).sort((a,b) => b.localeCompare(a)); // Descending strings
        const activeDayObjects = activeDays.map(ds => {
            const data = dayMap[ds];
            // Infer main workout type for the day by finding the one with the most sets
            let mainWId = null;
            let maxCount = 0;
            for (const [wId, count] of Object.entries(data.workoutCounts)) {
                if (count > maxCount) {
                    maxCount = count;
                    mainWId = wId;
                }
            }
            const workoutName = workoutNameMap[mainWId] || 'Mixed Workout';
            
            return {
                dateStr: ds,
                date: data.date,
                volume: data.volume,
                workoutName,
                setCount: data.sets.length
            };
        });

        // Calculate dynamic Active Week based on first set ever logged
        let calculatedActiveWeek = 1;
        if (activeDayObjects.length > 0) {
            const firstDate = activeDayObjects[activeDayObjects.length - 1].date;
            const normalizedFirst = new Date(firstDate);
            normalizedFirst.setHours(0, 0, 0, 0);
            
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            const diffTime = Math.abs(now - normalizedFirst);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            calculatedActiveWeek = Math.floor(diffDays / 7) + 1;
        }

        // --- Weekly View Setup ---
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sun
        
        // This Monday
        const currentMonday = new Date(now);
        currentMonday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        currentMonday.setHours(0, 0, 0, 0);

        // Start of target week
        const monday = new Date(currentMonday);
        monday.setDate(currentMonday.getDate() - (weekOffset * 7));

        // End of target week
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 7);
        // If it's this week, cap it at 'now'
        const rangeEnd = weekOffset === 0 ? new Date() : sunday;

        // Filter active days for the target week
        const daysThisWeek = activeDayObjects.filter(d => d.date >= monday && d.date < rangeEnd);
        const workoutsThisWeek = daysThisWeek.length;
        
        // Total volume this week
        const totalVolumeThisWeek = daysThisWeek.reduce((sum, d) => sum + d.volume, 0);

        // Weekly Heatmap (0=Mon ... 6=Sun) based on active days flag or count
        const weeklyHeatmap = [0, 0, 0, 0, 0, 0, 0];
        daysThisWeek.forEach(d => {
            let dayIdx = d.date.getDay();
            dayIdx = dayIdx === 0 ? 6 : dayIdx - 1; // Map Sun(0)->6, M(1)->0
            // Increment by 1 per active day (could also do setCount for intensity)
            weeklyHeatmap[dayIdx]++; 
        });

        // 5. Streak Calculation
        let streak = 0;
        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
        
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yestStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

        // Fast set lookup
        const daySet = new Set(activeDays);
        
        let checkDate = new Date();
        // If they didn't work out today, start checking from yesterday
        if (!daySet.has(todayStr)) {
            checkDate.setDate(checkDate.getDate() - 1);
        }

        for (let i = 0; i < 365; i++) {
            const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth()+1).padStart(2,'0')}-${String(checkDate.getDate()).padStart(2,'0')}`;
            if (daySet.has(checkStr)) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }

        // 6. PRs This Week
        const setsByExercise = {};
        sets.forEach(s => {
            if (!setsByExercise[s.exercise_id]) setsByExercise[s.exercise_id] = [];
            setsByExercise[s.exercise_id].push(s);
        });

        let prsThisWeek = 0;
        const prDetailsList = [];
        Object.entries(setsByExercise).forEach(([exId, exSets]) => {
            const thisWeekSets = exSets.filter(s => new Date(s.timestamp) >= monday);
            const prevWeekSets = exSets.filter(s => new Date(s.timestamp) < monday);
            
            if (thisWeekSets.length === 0 || prevWeekSets.length === 0) return;
            
            const thisWeekMax = Math.max(...thisWeekSets.map(s => parseFloat(s.weight) || 0));
            const prevMax = Math.max(...prevWeekSets.map(s => parseFloat(s.weight) || 0));
            
            if (thisWeekMax > prevMax) {
                prsThisWeek++;
                const name = exerciseNameMap[parseInt(exId)] || 'Exercise';
                prDetailsList.push(`${name}: ${thisWeekMax}kg`);
            }
        });

        // 7. Recent Activity List
        // Map the most recent active days into the recent activity log UI
        const recentActivity = activeDayObjects.slice(0, 10).map(d => ({
            date: d.date.toISOString(),
            workout: d.workoutName,
            duration: 0, // No longer tracked
            pr_count: 0,
            pr_details: null,
            setsLogged: d.setCount // optional context
        }));

        // Label for the week range
        const formatDate = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const weekLabel = `${formatDate(monday)} - ${formatDate(new Date(sunday.getTime() - 1))}`;

        return {
            success: true,
            data: {
                calculated_active_week: calculatedActiveWeek,
                workouts_this_week: workoutsThisWeek,
                total_volume_this_week: totalVolumeThisWeek,
                streak,
                total_sessions: activeDays.length, // total distinct days worked out
                weekly_heatmap: weeklyHeatmap,
                prs_this_week: prsThisWeek,
                pr_details_list: prDetailsList,
                recent_activity: recentActivity,
                week_label: weekLabel
            }
        };
    } catch(e) {
        console.error('getDashboardStats error', e);
        return { success: false };
    }
};

// Progress graph data: max weight per chronological session per exercise
export const getProgressData = async (user) => {
    try {
        const userId = await getUserId(user);
        if (!userId) return { success: false };

        // All sets for the trend line (all time max per day)
        const { data: allSets } = await supabase
            .from('sets')
            .select('exercise_id, weight, timestamp')
            .eq('user_id', userId)
            .not('timestamp', 'is', null)
            .order('timestamp', { ascending: true });

        // Last 45 days for raw scatter dots
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 45);
        const { data: recentSets } = await supabase
            .from('sets')
            .select('exercise_id, weight, reps, timestamp')
            .eq('user_id', userId)
            .not('timestamp', 'is', null)
            .gte('timestamp', cutoff.toISOString())
            .order('timestamp', { ascending: true });

        const { data: allExercises } = await supabase
            .from('exercises')
            .select('id, name');

        const exerciseNameMap = {};
        if (allExercises) {
            allExercises.forEach(e => { exerciseNameMap[e.id] = e.name; });
        }

        // Group by exercise -> Date string -> max weight (trend line)
        const progressMap = {};
        const exercisesWithData = new Set();

        (allSets || []).forEach(s => {
            const exId = s.exercise_id;
            const w = s.weight ? parseFloat(s.weight) : 0;
            const d = new Date(s.timestamp);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

            if (!progressMap[exId]) progressMap[exId] = {};
            if (!progressMap[exId][dateStr] || w > progressMap[exId][dateStr]) {
                progressMap[exId][dateStr] = w;
            }
            exercisesWithData.add(exId);
        });

        // Build raw dots (every set) for last 45 days
        const rawDotsMap = {};
        (recentSets || []).forEach(s => {
            const exId = s.exercise_id;
            const w = s.weight ? parseFloat(s.weight) : 0;
            if (w <= 0) return;
            const d = new Date(s.timestamp);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            if (!rawDotsMap[exId]) rawDotsMap[exId] = [];
            rawDotsMap[exId].push({ date: dateStr, weight: w, reps: s.reps || 0 });
        });

        // Build exercise list with names
        const exerciseList = Array.from(exercisesWithData).map(id => ({
            id: parseInt(id),
            name: exerciseNameMap[parseInt(id)] || `Exercise ${id}`
        })).sort((a, b) => a.name.localeCompare(b.name));

        // Build chronological progress series per exercise (trend line)
        const progressSeries = {};
        Object.entries(progressMap).forEach(([exId, dateData]) => {
            const dates = Object.keys(dateData).sort((a, b) => a.localeCompare(b));
            progressSeries[exId] = dates.map(d => ({ week: d, maxWeight: dateData[d] }));
        });

        return {
            success: true,
            data: { exerciseList, progressSeries, rawDotsMap }
        };
    } catch (e) {
        console.error('getProgressData error', e);
        return { success: false };
    }
};

export const updateExerciseNotes = async (exerciseId, setupNotes, user, isSyncing = false) => {
    if (!navigator.onLine && !isSyncing) {
        addToOfflineQueue('updateExerciseNotes', { exerciseId, setupNotes, user });
        return { success: true, message: "Queued offline" };
    }
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
    
    if (data) {
        data.goal = localStorage.getItem(`gym_buddy_goal_${userId}`);
    }
    return data;
};

export const updateUserProfile = async (user, profileData) => {
    const userId = await getUserId(user);
    if (!userId) return { success: false };
    
    const { goal, ...restData } = profileData;
    
    if (goal !== undefined && goal !== null) {
        localStorage.setItem(`gym_buddy_goal_${userId}`, goal);
    }
    
    if (Object.keys(restData).length > 0) {
        const { error } = await supabase
            .from('users')
            .update(restData)
            .eq('id', userId);
        
        return { success: !error, message: error ? error.message : 'Updated' };
    }
    
    return { success: true, message: 'Updated' };
};

export const healthCheck = async () => {
    // Check connection
    const { error } = await supabase.from('workouts').select('count', { count: 'exact', head: true });
    if (error) return { status: "error" };
    return { status: "ok" };
};

// Returns a Set of date strings (YYYY-MM-DD) where the user has logged sets for a given workout
export const getCompletedDates = async (user, workoutType = null) => {
    try {
        const userId = await getUserId(user);
        if (!userId) return new Set();

        let exerciseIds = [];
        if (workoutType) {
            // Get workout_id for this workout type
            const { data: workoutData } = await supabase
                .from('workouts')
                .select('id')
                .eq('name', workoutType)
                .limit(1)
                .single();
            if (!workoutData) return new Set();

            // Get all exercises for this workout
            const { data: exercises } = await supabase
                .from('exercises')
                .select('id')
                .eq('workout_id', workoutData.id);
            if (!exercises || exercises.length === 0) return new Set();

            exerciseIds = exercises.map(e => e.id);
        }

        // Get distinct dates via timestamps (if workoutType is null, get ALL completed dates broadly)
        let query = supabase
            .from('sets')
            .select('timestamp')
            .eq('user_id', userId)
            .not('timestamp', 'is', null);
            
        if (exerciseIds.length > 0) {
            query = query.in('exercise_id', exerciseIds);
        }

        const { data: sets } = await query;

        const dateSet = new Set();
        (sets || []).forEach(s => {
            const d = new Date(s.timestamp);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            dateSet.add(dateStr);
        });
        
        return dateSet;
    } catch (e) {
        console.error('getCompletedDates error', e);
        return new Set();
    }
};

