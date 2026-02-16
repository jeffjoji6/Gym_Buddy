import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

export const getUsers = async () => {
    const response = await api.get('/users');
    return response.data; // returns { users: [] }
};

export const deleteUser = async (username) => {
    const response = await api.delete(`/user/${username}`);
    return response.data;
};

export const getWorkout = async (type, week, user, split = "A") => {
  const response = await api.get(`/workout/${type}?week=${week}&user=${user}&split=${split}`);
  return response.data;
};

export const getWorkouts = async () => {
  const response = await api.get('/workouts');
  return response.data;
};

export const logSet = async (payload) => {
  const response = await api.post('/log', payload);
  return response.data;
};

export const updateSet = async (payload) => {
  const response = await api.put('/set/update', payload);
  return response.data;
};

export const deleteSet = async (payload) => {
  const response = await api.delete('/set/delete', { data: payload });
  return response.data;
};

export const parseCommand = async (text, workoutType, user) => {
  const response = await api.post('/parse', { text, workout_type: workoutType, user });
  return response.data;
};

export const healthCheck = async () => {
    try {
        const response = await api.get('/health');
        return response.data;
    } catch (e) {
        return { status: "error" };
    }
};

export const createWorkout = async (name) => {
    const response = await api.post('/workout', { name });
    return response.data;
};

export const addExercise = async (workoutType, name, user = null, split = "A") => {
    const response = await api.post('/exercise', { workout_type: workoutType, name, user, split });
    return response.data;
};

export const deleteExercise = async (workoutType, exerciseName, user = null) => {
    const response = await api.delete('/exercise', { 
        params: { workout_type: workoutType, exercise_name: exerciseName, user } 
    });
    return response.data;
};

export const deleteWorkout = async (workoutType) => {
    const response = await api.delete(`/workout/${workoutType}`);
    return response.data;
};

export const startSession = async (user, workoutType, split = "A") => {
    const response = await api.post('/session/start', { user, workout_type: workoutType, split });
    return response.data;
};

export const endSession = async (sessionId, user, notes = "") => {
    const response = await api.post('/session/end', { session_id: sessionId, user, notes });
    return response.data;
};

export const getDashboardStats = async (user) => {
    const response = await api.get(`/dashboard/stats?user=${user}`);
    return response.data;
};
