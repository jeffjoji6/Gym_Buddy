import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, Calendar, Trash2 } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function Home() {
    const navigate = useNavigate();
    const { user: currentUser, activeWeek, setActiveWeek } = useUser();

    const [showCreate, setShowCreate] = useState(false);
    const [newWorkoutName, setNewWorkoutName] = useState('');
    const [workouts, setWorkouts] = useState([]);
    const [isEditing, setIsEditing] = useState(false);

    React.useEffect(() => {
        const fetchWorkouts = async () => {
            if (!currentUser) return; // Wait for user context

            const { getWorkouts } = await import('../services/api');
            const data = await getWorkouts(currentUser);

            // Merge with default icons/colors
            const defaults = {
                'Push': { icon: '💪', color: '#ff6b6b' },
                'Pull': { icon: '🧗', color: '#4ecdc4' },
                'Legs': { icon: '🦵', color: '#ffe66d' }
            };

            const mapped = data.workouts.map(w => ({
                type: w.name,
                is_global: w.is_global,
                icon: defaults[w.name]?.icon || '🏋️',
                color: defaults[w.name]?.color || '#a0a0a0'
            }));
            setWorkouts(mapped);
        };
        fetchWorkouts();
    }, [currentUser]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (newWorkoutName.trim()) {
            const { createWorkout, getWorkouts } = await import('../services/api');
            // Pass current user to identify who created it
            await createWorkout(newWorkoutName.trim(), currentUser);

            // Refresh list
            const data = await getWorkouts(currentUser);
            const defaults = {
                'Push': { icon: '💪', color: '#ff6b6b' },
                'Pull': { icon: '🧗', color: '#4ecdc4' },
                'Legs': { icon: '🦵', color: '#ffe66d' }
            };
            const mapped = data.workouts.map(w => ({
                type: w.name,
                is_global: w.is_global,
                icon: defaults[w.name]?.icon || '🏋️',
                color: defaults[w.name]?.color || '#a0a0a0'
            }));
            setWorkouts(mapped);
            setShowCreate(false);
            setNewWorkoutName('');
        }
    };

    const handleWorkoutClick = (workout) => {
        // Go directly to Split A — no popup needed
        navigate(`/workout/${workout.type}?week=${activeWeek}&split=A`);
    };
    const handleDeleteWorkout = async (workoutName) => {
        if (window.confirm(`Are you sure you want to delete the "${workoutName}" workout?`)) {
            const { deleteWorkout, getWorkouts } = await import('../services/api');
            await deleteWorkout(workoutName);

            // Refresh list
            const data = await getWorkouts(currentUser);
            const defaults = {
                'Push': { icon: '💪', color: '#ff6b6b' },
                'Pull': { icon: '🧗', color: '#4ecdc4' },
                'Legs': { icon: '🦵', color: '#ffe66d' }
            };
            const mapped = data.workouts.map(w => ({
                type: w.name,
                is_global: w.is_global,
                icon: defaults[w.name]?.icon || '🏋️',
                color: defaults[w.name]?.color || '#a0a0a0'
            }));
            setWorkouts(mapped);
        }
    };
    return (
        <div className="animate-fade-in">
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} />
                    <span style={{ fontWeight: '600' }}>Active Week</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button className="button-secondary" onClick={() => setActiveWeek(activeWeek > 1 ? activeWeek - 1 : 1)}>-</button>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{activeWeek}</span>
                    <button className="button-secondary" onClick={() => setActiveWeek(activeWeek + 1)}>+</button>
                    <div style={{ width: '12px' }}></div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--primary-color)',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            cursor: 'pointer'
                        }}
                    >
                        {isEditing ? 'Done' : 'Edit'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '80px' }}>
                {workouts.map((w) => (
                    <div
                        key={w.type}
                        className="card animate-slide-up"
                        onClick={() => handleWorkoutClick(w)}
                        style={{
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderLeft: `4px solid ${w.color}`
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '2rem' }}>{w.icon}</span>
                            <div>
                                <h3 style={{ margin: 0 }}>{w.type} Day</h3>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Start Workout</span>
                            </div>
                        </div>
                        {isEditing ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorkout(w.type);
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--error-color)',
                                    cursor: 'pointer',
                                    padding: '8px'
                                }}
                            >
                                <Trash2 />
                            </button>
                        ) : (
                            <ArrowRight color="var(--text-dim)" />
                        )}
                    </div>
                ))}
            </div>


            <button
                style={{
                    position: 'fixed',
                    bottom: '28px',
                    right: '24px',
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    background: 'var(--primary-color)',
                    border: 'none',
                    color: '#000',
                    fontSize: '1.8rem',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(187, 134, 252, 0.5)',
                    zIndex: 100,
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                onClick={() => setShowCreate(true)}
            >
                +
            </button>


            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h3>Create New Workout</h3>
                        <form onSubmit={handleCreate}>
                            <input
                                type="text"
                                placeholder="Workout Name (e.g. Abs, Cardio)"
                                value={newWorkoutName}
                                onChange={e => setNewWorkoutName(e.target.value)}
                                style={{ width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="button-secondary" onClick={() => setShowCreate(false)} style={{ flex: 1 }}>Cancel</button>
                                <button className="button-primary" style={{ flex: 1 }}>Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
