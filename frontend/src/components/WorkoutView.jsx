import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getWorkout, logSet, updateSet, deleteSet, startSession, endSession, updateExerciseNotes } from '../services/api';
import { ChevronLeft, ChevronDown, ChevronUp, Check, Trash2, Trophy, Clock, BarChart2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import EditSetModal from './EditSetModal';
import { useNavigate } from 'react-router-dom';

const ExerciseCard = React.memo(({ exercise, onLog, onUpdate, onDelete, onDeleteExercise, onMoveUp, onMoveDown, week, isEditing, onUpdateNotes, workoutType, user, split }) => {
    const [expanded, setExpanded] = useState(false);
    const sets = exercise.sets || [];

    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [notes, setNotes] = useState(exercise.setup_notes || '');

    const [editingSet, setEditingSet] = useState(null);
    const [justLogged, setJustLogged] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);

    // Sync notes state when prop updates (e.g. after SWR cache replaced by fresh fetch)
    useEffect(() => {
        setNotes(exercise.setup_notes || '');
    }, [exercise.setup_notes]);

    const handleLog = async () => {
        if (!weight || !reps) return;
        await onLog(exercise.id, weight, reps);
        setReps('');

        // Trigger animation
        setJustLogged(true);
        setTimeout(() => setJustLogged(false), 500);
    };

    const handleEditSave = async (id, w, r) => {
        await onUpdate(id, w, r);
        setEditingSet(null);
    };

    const handleEditDelete = async (id) => {
        await onDelete(id);
        setEditingSet(null);
    };

    return (
        <div className={`card ${justLogged ? 'success-pulse' : ''}`} style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}
            >
                <span style={{ fontWeight: '600', fontSize: '1.2rem' }}>{exercise.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {exercise.prev_week_sets && exercise.prev_week_sets.length > 0 && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                            Last: {exercise.prev_week_sets.map(s => `${s.weight}kg x ${s.reps}`).join(', ')}
                        </span>
                    )}
                    {onDeleteExercise && isEditing && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm(`Delete exercise "${exercise.name}"?`)) {
                                        onDeleteExercise(exercise.id);
                                    }
                                }}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--error-color)',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </>
                    )}
                    <ChevronDown
                        size={24}
                        style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    />
                </div>
            </div>

            {expanded && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--surface-highlight)', paddingTop: '1rem' }} className="animate-fade-in">
                    {sets.length > 0 && (
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            {sets.map((s, i) => (
                                <div
                                    key={s.id || i}
                                    className="set-chip animate-slide-up"
                                    style={{
                                        animationDelay: `${i * 0.1}s`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        position: 'relative'
                                    }}
                                >
                                    <span onClick={() => setEditingSet(s)} style={{ cursor: 'pointer', flex: 1 }}>
                                        Set {s.set_number}: <strong>{s.weight}kg</strong> x {s.reps}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm('Delete this set?')) {
                                                onDelete(s.id);
                                            }
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--error-color)',
                                            cursor: 'pointer',
                                            padding: '2px',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '16px', alignItems: 'end' }}>
                        <div>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Weight</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                pattern="[0-9]*"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="0"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>Reps</label>
                            <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                placeholder="0"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <button
                            className="button-primary"
                            style={{ height: '54px', width: '54px', padding: 0 }}
                            onClick={handleLog}
                        >
                            <Check size={28} />
                        </button>
                    </div>
                </div>
            )}

            {/* Setup Notes Section */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid var(--surface-highlight)', paddingTop: '0.5rem' }}>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0'
                    }}
                >
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: '500' }}>
                        Setup Notes
                    </span>
                </div>

                <div className="animate-fade-in" style={{ marginTop: '0.5rem' }}>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g., Bench at 30°, Cable at notch 5, Seat position 3"
                        style={{
                            width: '100%',
                            minHeight: '60px',
                            background: 'var(--surface-highlight)',
                            border: '1px solid var(--surface-highlight)',
                            borderRadius: '8px',
                            padding: '8px',
                            color: 'var(--text-color)',
                            fontSize: '0.9rem',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button
                        onClick={async () => {
                            setSavingNotes(true);
                            await onUpdateNotes(exercise.id, notes);
                            setTimeout(() => setSavingNotes(false), 1000);
                        }}
                        className="button-secondary"
                        disabled={savingNotes}
                        style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            fontSize: '0.85rem',
                            padding: '8px',
                            background: savingNotes ? 'var(--success-color)' : 'transparent',
                            color: savingNotes ? '#000' : 'var(--text-color)',
                            borderColor: savingNotes ? 'var(--success-color)' : 'var(--text-dim)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {savingNotes ? 'Saved!' : 'Save Notes'}
                    </button>
                </div>
            </div>

            {editingSet && (
                <EditSetModal
                    set={editingSet}
                    onSave={handleEditSave}
                    onDelete={handleEditDelete}
                    onClose={() => setEditingSet(null)}
                />
            )}
        </div>
    );
});

export default function WorkoutView() {
    const { type } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const week = parseInt(searchParams.get('week') || '1');
    const split = searchParams.get('split') || 'A';
    const { user } = useUser();
    const navigate = useNavigate();

    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trigger, setTrigger] = useState(0);
    const [isEditing, setIsEditing] = useState(false);

    // Session State
    const [sessionId, setSessionId] = useState(null);
    const [summaryData, setSummaryData] = useState(null);
    const [showSummary, setShowSummary] = useState(false);
    const [finishNotes, setFinishNotes] = useState('');
    const [finishing, setFinishing] = useState(false);

    const [showAddExercise, setShowAddExercise] = useState(false);
    const [newExerciseName, setNewExerciseName] = useState('');
    const [isAddingExercise, setIsAddingExercise] = useState(false);
    const [showStartReminder, setShowStartReminder] = useState(false);
    const [draggedExId, setDraggedExId] = useState(null);

    // Timer State
    const [startTime, setStartTime] = useState(null);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        // Load session start time from local storage if available
        const storedStart = localStorage.getItem(`gym_buddy_session_${user}_${type}_${split}`);
        if (storedStart) {
            setStartTime(parseInt(storedStart));
            setSessionId(localStorage.getItem(`gym_buddy_session_id_${user}_${type}_${split}`));
        }
    }, [user, type, split]);

    useEffect(() => {
        const load = async () => {
            if (!user) return;

            const cacheKey = `gym_buddy_cache_${type}_${split}_${week}_${user}`;
            const cachedData = localStorage.getItem(cacheKey);
            let hasCache = false;

            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    let savedOrder = [];
                    try {
                        const saved = localStorage.getItem(`gym_buddy_order_${type}_${split}`);
                        if (saved) savedOrder = JSON.parse(saved);
                    } catch (e) { }

                    if (savedOrder.length > 0) {
                        parsed.sort((a, b) => {
                            const indexA = savedOrder.indexOf(a.id);
                            const indexB = savedOrder.indexOf(b.id);
                            if (indexA === -1 && indexB === -1) return 0;
                            if (indexA === -1) return 1;
                            if (indexB === -1) return -1;
                            return indexA - indexB;
                        });
                    }
                    setExercises(parsed);
                    hasCache = true;
                } catch (e) { }
            }

            // Only show full loading spinner on initial mount if NO CACHE exists
            if (!hasCache && exercises.length === 0) setLoading(true);

            try {
                const data = await getWorkout(type, week, user, split);

                // Sort based on local storage
                let savedOrder = [];
                try {
                    const saved = localStorage.getItem(`gym_buddy_order_${type}_${split}`);
                    if (saved) savedOrder = JSON.parse(saved);
                } catch (e) { }

                let sortedExercises = [...data.exercises];
                if (savedOrder.length > 0) {
                    sortedExercises.sort((a, b) => {
                        const indexA = savedOrder.indexOf(a.id);
                        const indexB = savedOrder.indexOf(b.id);
                        if (indexA === -1 && indexB === -1) return 0;
                        if (indexA === -1) return 1; // Put new ones at bottom
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                    });
                }

                // Update local storage if new exercises were added
                const currentIds = sortedExercises.map(e => e.id);
                localStorage.setItem(`gym_buddy_order_${type}_${split}`, JSON.stringify(currentIds));
                localStorage.setItem(cacheKey, JSON.stringify(sortedExercises));

                setExercises(sortedExercises);
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        load();
    }, [type, week, split, trigger, user]);

    // Scroll to active week
    useEffect(() => {
        const el = document.getElementById(`week-${week}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [week]);

    useEffect(() => {
        let interval;
        if (startTime && !showSummary) {
            interval = setInterval(() => {
                const now = Date.now();
                setDuration(Math.floor((now - startTime) / 1000));
            }, 1000);
        } else {
            setDuration(0);
        }
        return () => clearInterval(interval);
    }, [startTime, showSummary]);

    const handleLogSet = async (exerciseId, weight, reps) => {
        // Remind user to start workout if they haven't
        if (!startTime) {
            setShowStartReminder(true);
            return; // Don't log the set yet
        }

        const optimisticSet = {
            id: Date.now(), // temp id
            exercise_id: exerciseId,
            weight: parseFloat(weight),
            reps: parseInt(reps),
            set_number: exercises.find(e => e.id === exerciseId)?.sets?.length + 1 || 1
        };

        // Optimistic update
        setExercises(prev => prev.map(ex => {
            if (ex.id === exerciseId) {
                return { ...ex, sets: [...(ex.sets || []), optimisticSet] };
            }
            return ex;
        }));

        const res = await logSet({
            exercise_id: exerciseId,
            weight: parseFloat(weight),
            reps: parseInt(reps),
            week: week,
            user: user
        });

        if (res.success && res.data) {
            setExercises(prev => prev.map(ex => {
                if (ex.id === exerciseId) {
                    return {
                        ...ex,
                        sets: ex.sets.map(s => s.id === optimisticSet.id ? res.data : s)
                    };
                }
                return ex;
            }));
        } else {
            // Error handling fallback
            setTrigger(t => t + 1);
        }
    };

    const handleStartReminderConfirm = async () => {
        setShowStartReminder(false);
        await handleStartWorkout();
    };

    const handleUpdateSet = async (id, weight, reps) => {
        // Optimistic update
        setExercises(prev => prev.map(ex => ({
            ...ex,
            sets: (ex.sets || []).map(s => s.id === id ? { ...s, weight, reps } : s)
        })));

        await updateSet({
            set_id: id,
            weight: weight,
            reps: reps,
            user: user
        });
    };

    const handleDeleteSet = async (id) => {
        // Optimistic update
        setExercises(prev => prev.map(ex => ({
            ...ex,
            sets: (ex.sets || []).filter(s => s.id !== id)
        })));

        await deleteSet({
            set_id: id,
            user: user
        });
    };

    const handleAddExercise = async (e) => {
        e.preventDefault();
        const trimmedName = newExerciseName.trim();

        if (trimmedName && !isAddingExercise) {
            // Prevent duplicates
            const isDuplicate = exercises.some(ex => ex.name.toLowerCase() === trimmedName.toLowerCase());
            if (isDuplicate) {
                alert(`${trimmedName} is already in your workout!`);
                return;
            }

            setIsAddingExercise(true);
            const { addExercise } = await import('../services/api');
            await addExercise(type, trimmedName, user, split);
            setTrigger(t => t + 1);
            setShowAddExercise(false);
            setNewExerciseName('');
            setIsAddingExercise(false);
        }
    };

    const handleDeleteExercise = async (exerciseId) => {
        const newExercises = exercises.filter(ex => ex.id !== exerciseId);
        setExercises(newExercises);

        // Invalidate the SWR cache so deleted exercise doesn't reappear on next load
        const cacheKey = `gym_buddy_cache_${type}_${split}_${week}_${user}`;
        localStorage.setItem(cacheKey, JSON.stringify(newExercises));
        // Also update the order cache
        const newIds = newExercises.map(e => e.id);
        localStorage.setItem(`gym_buddy_order_${type}_${split}`, JSON.stringify(newIds));

        await deleteExercise(exerciseId);
    };

    const handleUpdateNotes = async (exerciseId, setupNotes) => {
        setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, setup_notes: setupNotes } : ex));
        await updateExerciseNotes(exerciseId, setupNotes, user);
    };

    const handleDragStart = (e, id) => {
        setDraggedExId(id);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = (e, targetId) => {
        e.preventDefault();
        if (!draggedExId || draggedExId === targetId) return;

        setExercises(prev => {
            const dragIndex = prev.findIndex(ex => ex.id === draggedExId);
            const dropIndex = prev.findIndex(ex => ex.id === targetId);
            if (dragIndex === -1 || dropIndex === -1) return prev;

            const newExercises = [...prev];
            const [draggedItem] = newExercises.splice(dragIndex, 1);
            newExercises.splice(dropIndex, 0, draggedItem);

            const currentIds = newExercises.map(e => e.id);
            localStorage.setItem(`gym_buddy_order_${type}_${split}`, JSON.stringify(currentIds));

            return newExercises;
        });
        setDraggedExId(null);
    };

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartWorkout = async () => {
        const now = Date.now();
        setStartTime(now);
        localStorage.setItem(`gym_buddy_session_${user}_${type}_${split}`, now.toString());

        const res = await startSession(user, type, split);
        if (res.success) {
            setSessionId(res.session_id);
            localStorage.setItem(`gym_buddy_session_id_${user}_${type}_${split}`, res.session_id);
        }
    };

    const handleFinishWorkout = async () => {
        if (!sessionId) {
            // Fallback if session ID lost but local start time exists (rare)
            setStartTime(null);
            localStorage.removeItem(`gym_buddy_session_${user}_${type}_${split}`);
            localStorage.removeItem(`gym_buddy_session_id_${user}_${type}_${split}`);
            return;
        }

        // Calculate total volume across all tracked sets
        let calculatedVolume = 0;
        exercises.forEach(ex => {
            if (ex.sets && Array.isArray(ex.sets)) {
                ex.sets.forEach(s => {
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps) || 0;
                    calculatedVolume += (w * r);
                });
            }
        });

        setFinishing(true);
        try {
            const res = await endSession(sessionId, user, finishNotes, calculatedVolume);
            if (res.success) {
                // Snapshot the live duration BEFORE clearing startTime
                const snapshotDuration = duration;
                setSummaryData({ ...res, duration_seconds: snapshotDuration });
                setShowSummary(true);
                // Clear session
                setStartTime(null);
                setSessionId(null);
                localStorage.removeItem(`gym_buddy_session_${user}_${type}_${split}`);
                localStorage.removeItem(`gym_buddy_session_id_${user}_${type}_${split}`);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to finish workout");
        }
        setFinishing(false);
    };

    const closeSummary = () => {
        setShowSummary(false);
        navigate('/');
    };

    return (
        <div className="animate-fade-in">
            <div className="header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                    <Link to="/">
                        <ChevronLeft size={32} />
                    </Link>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ margin: 0 }}>{type} Workout</h2>
                        <select
                            value={split}
                            onChange={(e) => {
                                const newSplit = e.target.value;
                                setSearchParams(prev => {
                                    prev.set('split', newSplit);
                                    return prev;
                                });
                            }}
                            style={{
                                fontSize: '0.9rem',
                                color: 'var(--text-dim)',
                                background: 'var(--surface-highlight)',
                                border: '1px solid var(--surface-highlight)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                marginTop: '4px',
                                cursor: 'pointer',
                                outline: 'none'
                            }}
                        >
                            <option value="A">Split 1</option>
                            <option value="B">Split 2</option>
                        </select>
                    </div>

                    {/* Timer / Start / Finish Button */}
                    {!startTime ? (
                        <button
                            className="button-primary"
                            onClick={handleStartWorkout}
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.9rem',
                                background: 'var(--success-color)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                        >
                            Start
                        </button>
                    ) : (
                        <button
                            className="button-danger"
                            onClick={handleFinishWorkout}
                            disabled={finishing}
                            style={{
                                padding: '8px 16px',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}
                        >
                            {formatTime(duration)} <Check size={16} />
                        </button>
                    )}
                </div>

                {/* Horizontal Week Selector */}
                <div style={{
                    display: 'flex',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    gap: '12px',
                    padding: '4px 0',
                    scrollbarWidth: 'none',
                    scrollBehavior: 'smooth'
                }}>
                    {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                        <div
                            key={w}
                            id={`week-${w}`}
                            onClick={() => setSearchParams({ week: w })}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                background: week === w ? 'var(--primary-color)' : 'var(--surface-highlight)',
                                color: week === w ? '#000' : 'var(--text-color)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                minWidth: '40px',
                                textAlign: 'center',
                                transition: 'all 0.2s',
                                flexShrink: 0 // Prevent squishing
                            }}
                        >
                            Week {w}
                        </div>
                    ))}
                </div>
            </div>



            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
            ) : (
                <div style={{ paddingBottom: '160px' }}>
                    {exercises.length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '2rem' }}>
                            No exercises yet. Add one!
                        </div>
                    )}
                    {exercises.map((ex, i) => (
                        <div
                            key={ex.id}
                            className="animate-slide-up"
                            style={{
                                animationDelay: `${i * 0.05}s`,
                                opacity: draggedExId === ex.id ? 0.5 : 1,
                                cursor: isEditing ? 'grab' : 'default',
                                transition: 'opacity 0.2s ease'
                            }}
                            draggable={isEditing}
                            onDragStart={(e) => isEditing && handleDragStart(e, ex.id)}
                            onDragOver={isEditing ? handleDragOver : undefined}
                            onDrop={(e) => isEditing && handleDrop(e, ex.id)}
                            onDragEnd={() => setDraggedExId(null)}
                        >
                            <ExerciseCard
                                exercise={ex}
                                onLog={handleLogSet}
                                onUpdate={handleUpdateSet}
                                onDelete={handleDeleteSet}
                                onDeleteExercise={handleDeleteExercise}
                                onUpdateNotes={handleUpdateNotes}
                                workoutType={type}
                                user={user}
                                split={split}
                                week={week}
                                isEditing={isEditing}
                            />
                        </div>
                    ))}

                    <button
                        className="button-secondary"
                        style={{
                            width: '100%',
                            marginTop: '1rem',
                            padding: '16px',
                            border: '2px dashed var(--text-dim)',
                            background: 'transparent',
                            color: 'var(--text-dim)'
                        }}
                        onClick={() => setShowAddExercise(true)}
                    >
                        + Add Exercise
                    </button>

                    {/* Edit Mode Toggle (Bottom) */}
                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {isEditing ? 'Done Editing' : 'Edit Exercises'}
                        </button>
                    </div>
                </div>
            )}



            {showAddExercise && (
                <div className="modal-overlay" onClick={() => setShowAddExercise(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <h3>Add Exercise to {type} (Split {split === 'A' ? '1' : '2'})</h3>
                        <form onSubmit={handleAddExercise}>
                            <input
                                type="text"
                                placeholder="Exercise Name (e.g. Crunches)"
                                value={newExerciseName}
                                onChange={e => setNewExerciseName(e.target.value)}
                                style={{ width: '100%', marginBottom: '1rem', boxSizing: 'border-box' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" className="button-secondary" onClick={() => setShowAddExercise(false)} style={{ flex: 1 }}>Cancel</button>
                                <button
                                    className="button-primary"
                                    style={{ flex: 1, opacity: isAddingExercise ? 0.7 : 1 }}
                                    disabled={isAddingExercise}
                                >
                                    {isAddingExercise ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )
            }

            {/* Summary Modal */}
            {
                showSummary && summaryData && (
                    <div className="modal-overlay" style={{ display: 'flex', alignItems: 'flex-end', zIndex: 1000 }}>
                        <div className="modal-content animate-slide-up" style={{
                            background: 'var(--surface-color)',
                            height: '70vh',
                            width: '100%',
                            borderRadius: '24px 24px 0 0',
                            overflowY: 'auto',
                            padding: '24px',
                            color: 'var(--text-color)'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <Trophy size={64} color="#ffd700" style={{ marginBottom: '1rem' }} />
                                <h2 style={{ fontSize: '2rem', margin: '0 0 8px 0' }}>Workout Complete!</h2>
                                <p style={{ color: 'var(--text-color)', fontSize: '1.2rem', fontWeight: '500' }}>Great job, {user}!</p>
                                <p style={{ color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '8px' }}>"One step closer to your goals. Keep showing up."</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '2rem' }}>
                                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                                    <Clock size={24} color="var(--primary-color)" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Duration</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.ceil((summaryData.duration_seconds || 0) / 60)}m</span>
                                </div>
                                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                                    <BarChart2 size={24} color="var(--success-color)" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Volume</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{(summaryData.total_volume / 1000).toFixed(1)}k</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>kg</span>
                                </div>
                            </div>

                            {summaryData.prs && summaryData.prs.length > 0 && (
                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Trophy size={20} color="#ffd700" />
                                        New Records
                                    </h3>
                                    {summaryData.prs.map((pr, i) => (
                                        <div key={i} style={{
                                            background: 'rgba(255, 215, 0, 0.1)',
                                            border: '1px solid #ffd700',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            marginBottom: '8px',
                                            color: '#ffd700'
                                        }}>
                                            {pr}
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dim)' }}>Notes</label>
                                <textarea
                                    value={finishNotes}
                                    onChange={e => setFinishNotes(e.target.value)}
                                    placeholder="How did it feel?"
                                    style={{
                                        width: '100%',
                                        minHeight: '80px',
                                        background: 'var(--surface-highlight)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '12px',
                                        color: 'var(--text-color)',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            <button
                                className="button-primary"
                                style={{ width: '100%' }}
                                onClick={closeSummary}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Start Workout Reminder Modal */}
            {showStartReminder && (
                <div className="modal-overlay" onClick={() => setShowStartReminder(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Start Your Workout</h3>
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginBottom: '2rem' }}>
                            You haven't started your workout yet! Would you like to start the timer now?
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                type="button"
                                className="button-secondary"
                                onClick={() => setShowStartReminder(false)}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="button-primary"
                                onClick={handleStartReminderConfirm}
                                style={{ flex: 1, background: 'var(--success-color)' }}
                            >
                                Start Now
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
