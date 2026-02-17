import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

console.log('API Base URL:', api.defaults.baseURL);

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

export const getWorkouts = async (user) => {
  const response = await api.get('/workouts', { params: { user } });
  // If we start filtering by user on backend for real, we'd pass user here:
  // const response = await api.get(`/workouts?username=${user}`);
  return response.data;
};

// ...

export const createWorkout = async (name, user = null) => {
    const response = await api.post('/workout', { name, user });
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
