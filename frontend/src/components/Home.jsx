import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Activity, Calendar, Trash2, X, Scale } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function Home() {
    const navigate = useNavigate();
    const { user: currentUser, selectedDate, setSelectedDate } = useUser();

    const [showCreate, setShowCreate] = useState(false);
    const [newWorkoutName, setNewWorkoutName] = useState('');
    const [workouts, setWorkouts] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [completedDates, setCompletedDates] = useState(new Set());

    const [weightPrompt, setWeightPrompt] = useState(false);
    const [quickWeight, setQuickWeight] = useState('');
    const [savingWeight, setSavingWeight] = useState(false);

    React.useEffect(() => {
        if (!currentUser) return;
        const todayStr = new Date().toDateString();
        const isMonday = new Date().getDay() === 1;
        const lastPrompt = localStorage.getItem(`gym_buddy_weighin_${currentUser}`);
        
        if (isMonday && lastPrompt !== todayStr) {
            setWeightPrompt(true);
        }
    }, [currentUser]);

    const handleQuickWeight = async () => {
        if (!quickWeight) return;
        setSavingWeight(true);
        const { updateUserProfile } = await import('../services/api');
        await updateUserProfile(currentUser, { weight_kg: parseFloat(quickWeight) });
        localStorage.setItem(`gym_buddy_weighin_${currentUser}`, new Date().toDateString());
        setWeightPrompt(false);
        setSavingWeight(false);
    };

    const dismissPrompt = () => {
        localStorage.setItem(`gym_buddy_weighin_${currentUser}`, new Date().toDateString());
        setWeightPrompt(false);
    };

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

            // Fetch completed dates for calendar dot markers
            const { getCompletedDates } = await import('../services/api');
            const dates = await getCompletedDates(currentUser);
            setCompletedDates(dates);

            const mapped = data.workouts.map(w => ({
                type: w.name,
                is_global: w.is_global,
                icon: defaults[w.name]?.icon || '🏋️',
                color: defaults[w.name]?.color || '#a0a0a0'
            }));
            setWorkouts(mapped);
        };
        fetchWorkouts();
    }, [currentUser, selectedDate]);

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
        navigate(`/workout/${workout.type}?date=${selectedDate}&split=A`);
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
            {weightPrompt && (
                <div style={{
                    background: 'rgba(3, 218, 198, 0.1)',
                    border: '1px solid rgba(3, 218, 198, 0.3)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '20px',
                    position: 'relative'
                }}>
                    <button onClick={dismissPrompt} style={{ position: 'absolute', top: '12px', right: '12px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)', fontWeight: 'bold', marginBottom: '8px' }}>
                        <Scale size={20} /> Hey {currentUser}!
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-color)', marginBottom: '12px' }}>
                        Start of a new week — have you checked your weight today?
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="number" 
                            inputMode="decimal"
                            value={quickWeight} 
                            onChange={e => setQuickWeight(e.target.value)} 
                            placeholder="Weight (kg)"
                            style={{ flex: 1, padding: '10px' }}
                        />
                        <button 
                            className="button-primary" 
                            onClick={handleQuickWeight} 
                            disabled={savingWeight || !quickWeight}
                            style={{ padding: '10px 16px' }}
                        >
                            {savingWeight ? 'Saving...' : 'Log It'}
                        </button>
                    </div>
                </div>
            )}

            <div className="card" style={{ padding: '16px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
                    <span style={{ fontWeight: 'bold' }}>
                        {(() => {
                            if (!selectedDate) return '';
                            const [y, m, d] = selectedDate.split('-');
                            return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                        })()}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="button-secondary" 
                            style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '12px' }}
                            onClick={() => {
                                const now = new Date();
                                const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
                                setSelectedDate(dateStr);
                            }}>
                            Today
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--primary-color)',
                                fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', paddingLeft: '8px'
                            }}
                        >
                            {isEditing ? 'Done' : 'Edit'}
                        </button>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                    {(() => {
                        if (!selectedDate) return null;
                        const [by, bm, bd] = selectedDate.split('-');
                        const baseDate = new Date(by, bm - 1, bd);
                        const days = [];
                        for(let i = -3; i <= 3; i++) {
                            const temp = new Date(baseDate);
                            temp.setDate(temp.getDate() + i);
                            days.push(temp);
                        }
                        
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

                        return days.map(d => {
                            const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                            const isSelected = dateStr === selectedDate;
                            const isToday = dateStr === todayStr;
                            const hasWorkout = completedDates.has(dateStr);
                            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                            
                            return (
                                <button 
                                    key={dateStr}
                                    onClick={() => setSelectedDate(dateStr)}
                                    style={{
                                        flex: 1, padding: '8px 4px 12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                                        background: isSelected ? 'var(--primary-color)' : 'transparent',
                                        borderRadius: '12px', border: 'none',
                                        color: isSelected ? '#000' : 'var(--text-color)',
                                        cursor: 'pointer', position: 'relative'
                                    }}
                                >
                                    <span style={{ fontSize: '0.75rem', color: isSelected ? 'rgba(0,0,0,0.6)' : isToday ? 'var(--primary-color)' : 'var(--text-dim)', fontWeight: 'bold' }}>{dayName}</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: isToday && !isSelected ? 'var(--primary-color)' : 'inherit' }}>{d.getDate()}</span>
                                    {hasWorkout && (
                                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? 'rgba(0,0,0,0.6)' : 'var(--success-color)', position: 'absolute', bottom: '6px' }} />
                                    )}
                                </button>
                            );
                        });
                    })()}
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
