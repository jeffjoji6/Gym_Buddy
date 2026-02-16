import React, { useState, useEffect } from 'react';
import { getWorkouts, createWorkout, deleteWorkout, getWorkout, addExercise, deleteExercise } from '../services/api';
import { Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react';

export default function Admin() {
    const [workouts, setWorkouts] = useState([]);
    const [newWorkoutName, setNewWorkoutName] = useState('');
    const [expandedWorkout, setExpandedWorkout] = useState(null);
    const [exercises, setExercises] = useState([]);
    const [newExerciseName, setNewExerciseName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadWorkouts();
    }, []);

    const loadWorkouts = async () => {
        const data = await getWorkouts();
        setWorkouts(data.workouts || []);
    };

    const handleCreateWorkout = async (e) => {
        e.preventDefault();
        if (!newWorkoutName.trim()) return;
        await createWorkout(newWorkoutName);
        setNewWorkoutName('');
        loadWorkouts();
    };

    const handleDeleteWorkout = async (name) => {
        if (window.confirm(`Delete workout "${name}"? This will delete all associated data.`)) {
            await deleteWorkout(name);
            loadWorkouts();
            if (expandedWorkout === name) setExpandedWorkout(null);
        }
    };

    const toggleWorkout = async (name) => {
        if (expandedWorkout === name) {
            setExpandedWorkout(null);
            setExercises([]);
        } else {
            setExpandedWorkout(name);
            setLoading(true);
            try {
                // Fetch exercises for the workout using a dummy user 'admin' and week 1
                // We only care about the list of exercises, not the logs
                const data = await getWorkout(name, 1, 'admin');
                setExercises(data.exercises || []);
            } catch (error) {
                console.error("Failed to load exercises", error);
            }
            setLoading(false);
        }
    };

    const handleAddExercise = async (e) => {
        e.preventDefault();
        if (!newExerciseName.trim() || !expandedWorkout) return;
        // Pass 'admin' user to create default/global exercise
        await addExercise(expandedWorkout, newExerciseName, 'admin');
        setNewExerciseName('');
        // Refresh exercises
        const data = await getWorkout(expandedWorkout, 1, 'admin');
        setExercises(data.exercises || []);
    };

    const handleDeleteExercise = async (exerciseName) => {
        if (window.confirm(`Delete exercise "${exerciseName}" from ${expandedWorkout}?`)) {
            // Pass 'admin' to delete default/global exercise
            await deleteExercise(expandedWorkout, exerciseName, 'admin');
            // Refresh exercises
            const data = await getWorkout(expandedWorkout, 1, 'admin');
            setExercises(data.exercises || []);
        }
    };

    return (
        <div className="container animate-fade-in">
            <h1>Admin Panel</h1>

            <div className="card">
                <h3>Create New Workout Type</h3>
                <form onSubmit={handleCreateWorkout} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={newWorkoutName}
                        onChange={e => setNewWorkoutName(e.target.value)}
                        placeholder="Workout Name (e.g. Cardio)"
                        style={{ flex: 1 }}
                    />
                    <button className="button-primary">Create</button>
                </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {workouts.map(w => (
                    <div key={w} className="card" style={{ padding: '0' }}>
                        <div
                            style={{
                                padding: '1rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                background: expandedWorkout === w ? 'var(--surface-highlight)' : 'transparent',
                                borderTopLeftRadius: '16px',
                                borderTopRightRadius: '16px',
                                borderBottomLeftRadius: expandedWorkout === w ? '0' : '16px',
                                borderBottomRightRadius: expandedWorkout === w ? '0' : '16px',
                            }}
                            onClick={() => toggleWorkout(w)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {expandedWorkout === w ? <ChevronDown /> : <ChevronRight />}
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{w}</span>
                            </div>
                            <button
                                className="button-danger"
                                style={{ padding: '8px', fontSize: '0.9rem' }}
                                onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(w); }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {expandedWorkout === w && (
                            <div style={{ padding: '1rem', borderTop: '1px solid var(--bg-color)' }} className="animate-slide-up">
                                <h4>Exercises in {w}</h4>
                                {loading ? (
                                    <p>Loading...</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                                        {exercises.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No exercises yet.</p>}
                                        {exercises.map(ex => (
                                            <div
                                                key={ex.id}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px',
                                                    background: 'var(--bg-color)',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <span>{ex.name}</span>
                                                <button
                                                    className="button-danger"
                                                    style={{ padding: '6px', background: 'transparent', color: 'var(--error-color)' }}
                                                    onClick={() => handleDeleteExercise(ex.name)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={handleAddExercise} style={{ display: 'flex', gap: '10px' }}>
                                    <input
                                        type="text"
                                        value={newExerciseName}
                                        onChange={e => setNewExerciseName(e.target.value)}
                                        placeholder="Add Exercise Name"
                                        style={{ flex: 1 }}
                                    />
                                    <button className="button-secondary" style={{ padding: '10px' }}>
                                        <Plus size={20} />
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
