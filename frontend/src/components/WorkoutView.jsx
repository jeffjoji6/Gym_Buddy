import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getWorkout, logSet, updateSet, deleteSet, deleteExercise, updateExerciseNotes } from '../services/api';
import { ChevronLeft, ChevronDown, ChevronUp, Check, Trash2, Trophy, Clock, BarChart2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { useTimer } from '../context/TimerContext';
import EditSetModal from './EditSetModal';
import WorkoutSummaryModal from './WorkoutSummaryModal';


const ExerciseCard = React.memo(({ exercise, onLog, onUpdate, onDelete, onDeleteExercise, onMoveUp, onMoveDown, isEditing, onUpdateNotes, workoutType, user, split }) => {
    const [expanded, setExpanded] = useState(false);
    const sets = exercise.sets || [];
    const { startRestTimer } = useTimer() || {};

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
        if (navigator.vibrate) navigator.vibrate(20);
        const success = await onLog(exercise.id, weight, reps);
        if (success !== false) {
            setReps('');
            setJustLogged(true);
            setTimeout(() => setJustLogged(false), 500);
            if (startRestTimer) startRestTimer(90);
        }
    };

    const handleEditSave = async (id, w, r) => {
        await onUpdate(id, w, r);
        setEditingSet(null);
    };

    const handleEditDelete = async (id) => {
        await onDelete(id);
        setEditingSet(null);
    };

    const setsComplete = sets.length >= 3;

    let overloadTip = null;
    if (exercise.prev_week_sets && exercise.prev_week_sets.length > 0) {
        const topSet = exercise.prev_week_sets.reduce((max, s) => {
            return (parseFloat(s.weight) > parseFloat(max.weight)) ? s : max;
        }, exercise.prev_week_sets[0]);
        const nextWeight = parseFloat(topSet.weight) + 2.5; 
        overloadTip = `💡 Last week: ${topSet.weight}kg × ${topSet.reps} → Try ${nextWeight}kg today!`;
    }

    return (
        <div className={`card ${justLogged ? 'success-pulse' : ''}`} style={{
            padding: '0.75rem',
            marginBottom: '0.5rem',
            borderLeft: setsComplete ? '4px solid var(--success-color)' : 'none',
            background: setsComplete ? 'rgba(3, 218, 198, 0.08)' : 'var(--surface-color)'
        }}>
            <div
                onClick={() => {
                    setExpanded(!expanded);
                    if (navigator.vibrate) navigator.vibrate(10);
                }}
                style={{ cursor: 'pointer', padding: '8px 0' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '1.15rem' }}>{exercise.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {onDeleteExercise && isEditing && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (navigator.vibrate) navigator.vibrate(30);
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
                        )}
                        <ChevronDown
                            size={22}
                            color="var(--text-dim)"
                            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                        />
                    </div>
                </div>
                {/* Last week set pills */}
                {exercise.prev_week_sets && exercise.prev_week_sets.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', alignSelf: 'center', fontWeight: '500' }}>Last</span>
                        {exercise.prev_week_sets.map((s, idx) => (
                            <div key={idx} style={{
                                padding: '3px 10px',
                                borderRadius: '12px',
                                background: 'rgba(187, 134, 252, 0.1)',
                                border: '1px solid rgba(187, 134, 252, 0.2)',
                                fontSize: '0.78rem',
                                color: 'var(--primary-color)',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                            }}>
                                {s.weight}kg × {s.reps}
                            </div>
                        ))}
                    </div>
                )}
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

                    {overloadTip && (
                        <div style={{ background: 'rgba(187, 134, 252, 0.1)', color: 'var(--primary-color)', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '16px', fontWeight: '500' }}>
                            {overloadTip}
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
                            const result = await onUpdateNotes(exercise.id, notes);
                            if (result === false) {
                                setSavingNotes(false);
                            } else {
                                setTimeout(() => setSavingNotes(false), 1000);
                            }
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
    
    // Default to today using localized string generator
    const getLocalToday = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    
    const dateStr = searchParams.get('date') || getLocalToday();
    const split = searchParams.get('split') || 'A';
    
    const { user } = useUser();
    const { addNotification } = useNotifications();

    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [trigger, setTrigger] = useState(0);
    const [isEditing, setIsEditing] = useState(false);

    const [newExerciseName, setNewExerciseName] = useState('');
    const [isAddingExercise, setIsAddingExercise] = useState(false);
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [draggedExId, setDraggedExId] = useState(null);
    const [prToast, setPrToast] = useState(null);
    const [showSummaryModal, setShowSummaryModal] = useState(false);

    // Fetch generation counter to prevent stale network responses from overwriting optimistic updates
    const fetchGenRef = useRef(0);
    const optimisticRef = useRef(false);


    useEffect(() => {
        const load = async () => {
            if (!user) return;

            const cacheKey = `gym_buddy_cache_${type}_${split}_${dateStr}_${user}`;
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

            // Increment fetch generation so stale responses are discarded
            const thisGen = ++fetchGenRef.current;

            try {
                const data = await getWorkout(type, dateStr, user, split);

                // If a newer fetch was started or optimistic update happened, skip this stale response
                if (fetchGenRef.current !== thisGen) return;
                if (optimisticRef.current) {
                    optimisticRef.current = false;
                    return;
                }

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
    }, [type, dateStr, split, trigger, user]);

    const handleLogSet = async (exerciseId, weight, reps) => {
        const newWeight = parseFloat(weight);
        const exercise = exercises.find(e => e.id === exerciseId);

        // PR Detection: compare against all known sets
        if (exercise) {
            const allPrevWeights = [
                ...(exercise.sets || []).map(s => parseFloat(s.weight) || 0),
                ...(exercise.prev_week_sets || []).map(s => parseFloat(s.weight) || 0)
            ];
            const prevMax = allPrevWeights.length > 0 ? Math.max(...allPrevWeights) : 0;
            if (newWeight > prevMax && prevMax > 0) {
                setPrToast({ name: exercise.name, weight: newWeight });
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
                // Push notification
                addNotification('pr', '🏆 New PR!', `${exercise.name} — ${newWeight}kg`, '🏆');
                setTimeout(() => setPrToast(null), 3500);
            }
        }

        const optimisticSet = {
            id: Date.now(), // temp id
            exercise_id: exerciseId,
            weight: newWeight,
            reps: parseInt(reps),
            set_number: exercise?.sets?.length + 1 || 1
        };

        // Optimistic update
        optimisticRef.current = true;
        setExercises(prev => prev.map(ex => {
            if (ex.id === exerciseId) {
                return { ...ex, sets: [...(ex.sets || []), optimisticSet] };
            }
            return ex;
        }));

        const res = await logSet({
            exercise_id: exerciseId,
            weight: newWeight,
            reps: parseInt(reps),
            date: dateStr,
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
            return true;
        } else {
            // Rollback optimistic update
            setExercises(prev => prev.map(ex => {
                if (ex.id === exerciseId) {
                    return { ...ex, sets: (ex.sets || []).filter(s => s.id !== optimisticSet.id) };
                }
                return ex;
            }));
            addNotification('error', '❌ Failed to log set', res.message || 'Please try again', '❌');
            return false;
        }
    };



    const handleUpdateSet = async (id, weight, reps) => {
        // Save old state for rollback
        const prevExercises = exercises;
        // Optimistic update
        optimisticRef.current = true;
        setExercises(prev => prev.map(ex => ({
            ...ex,
            sets: (ex.sets || []).map(s => s.id === id ? { ...s, weight, reps } : s)
        })));

        const res = await updateSet({
            set_id: id,
            weight: weight,
            reps: reps,
            user: user
        });
        if (!res.success) {
            setExercises(prevExercises);
            addNotification('error', '❌ Failed to update set', res.message || 'Please try again', '❌');
        }
    };

    const handleDeleteSet = async (id) => {
        const prevExercises = exercises;
        // Optimistic update
        optimisticRef.current = true;
        setExercises(prev => prev.map(ex => ({
            ...ex,
            sets: (ex.sets || []).filter(s => s.id !== id)
        })));

        const res = await deleteSet({
            set_id: id,
            user: user
        });
        if (!res.success) {
            setExercises(prevExercises);
            addNotification('error', '❌ Failed to delete set', res.message || 'Please try again', '❌');
        }
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

            // Optimistic update — add a placeholder exercise immediately
            const optimisticId = `temp_${Date.now()}`;
            const optimisticExercise = {
                id: optimisticId,
                name: trimmedName,
                sets: [],
                prev_week_sets: [],
                setup_notes: ''
            };
            optimisticRef.current = true;
            setExercises(prev => [...prev, optimisticExercise]);
            setShowAddExercise(false);
            setNewExerciseName('');

            setIsAddingExercise(true);
            const { addExercise } = await import('../services/api');
            const res = await addExercise(type, trimmedName, user, split);

            if (res.success) {
                // Refetch to get the real ID from the server
                optimisticRef.current = false; // allow this refetch to go through
                setTrigger(t => t + 1);
            } else {
                // Rollback optimistic insert
                setExercises(prev => prev.filter(ex => ex.id !== optimisticId));
                addNotification('error', '❌ Failed to add exercise', res.message || 'Please try again', '❌');
            }
            setIsAddingExercise(false);
        }
    };

    const handleDeleteExercise = async (exerciseId) => {
        const prevExercises = exercises;
        const newExercises = exercises.filter(ex => ex.id !== exerciseId);
        optimisticRef.current = true;
        setExercises(newExercises);

        // Invalidate the SWR cache so deleted exercise doesn't reappear on next load
        const cacheKey = `gym_buddy_cache_${type}_${split}_${dateStr}_${user}`;
        localStorage.setItem(cacheKey, JSON.stringify(newExercises));
        const newIds = newExercises.map(e => e.id);
        localStorage.setItem(`gym_buddy_order_${type}_${split}`, JSON.stringify(newIds));

        const res = await deleteExercise(exerciseId);
        if (!res.success) {
            // Rollback
            setExercises(prevExercises);
            localStorage.setItem(cacheKey, JSON.stringify(prevExercises));
            const oldIds = prevExercises.map(e => e.id);
            localStorage.setItem(`gym_buddy_order_${type}_${split}`, JSON.stringify(oldIds));
            addNotification('error', '❌ Failed to delete exercise', res.message || 'Please try again', '❌');
        }
    };

    const handleUpdateNotes = async (exerciseId, setupNotes) => {
        const prevExercises = exercises;
        optimisticRef.current = true;
        setExercises(prev => prev.map(ex => ex.id === exerciseId ? { ...ex, setup_notes: setupNotes } : ex));
        const res = await updateExerciseNotes(exerciseId, setupNotes, user);
        if (!res.success) {
            setExercises(prevExercises);
            addNotification('error', '❌ Failed to save notes', res.message || 'Please try again', '❌');
            return false;
        }
        return true;
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





    return (
        <div className="animate-fade-in">
            {/* PR Blast Overlay */}
            {prToast && (
                <div className="pr-blast-overlay" onClick={() => setPrToast(null)}>
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="confetti-particle"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${1.5 + Math.random() * 2}s`,
                                background: ['#ffd700', '#ff6b6b', '#03dac6', '#bb86fc', '#ff8c00', '#4ecdc4'][i % 6],
                                width: `${8 + Math.random() * 8}px`,
                                height: `${8 + Math.random() * 8}px`,
                                borderRadius: Math.random() > 0.5 ? '50%' : '2px'
                            }}
                        />
                    ))}
                    <div className="pr-blast-content">
                        <div className="pr-blast-trophy">🏆</div>
                        <div className="pr-blast-fire">🔥🔥🔥</div>
                        <h1 className="pr-blast-title">NEW PR!</h1>
                        <div className="pr-blast-details">{prToast.name}</div>
                        <div className="pr-blast-weight">{prToast.weight} kg</div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '12px' }}>Tap to dismiss</div>
                    </div>
                </div>
            )}

            <div style={{ marginBottom: '16px' }}>
                {/* Top row: back + title */}
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <Link to="/" style={{ color: 'var(--text-color)', display: 'flex' }}>
                        <ChevronLeft size={28} />
                    </Link>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', letterSpacing: '0.5px' }}>{type}</h2>
                    </div>
                </div>

                {/* Split toggle */}
                <div style={{ display: 'flex', gap: '0', marginBottom: '12px', background: 'var(--surface-highlight)', borderRadius: '10px', padding: '3px' }}>
                    {['A', 'B'].map(s => {
                        const isActive = split === s;
                        return (
                            <button
                                key={s}
                                onClick={() => {
                                    if (navigator.vibrate) navigator.vibrate(10);
                                    setSearchParams(prev => { prev.set('split', s); return prev; });
                                }}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                    background: isActive ? 'var(--primary-color)' : 'transparent',
                                    color: isActive ? '#000' : 'var(--text-dim)',
                                    fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                Split {s === 'A' ? '1' : '2'}
                            </button>
                        );
                    })}
                </div>

                {/* Date Display */}
                <div style={{
                    width: '100%',
                    textAlign: 'center',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: 'var(--primary-color)',
                    color: '#000',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    marginBottom: '8px',
                    boxShadow: '0 4px 12px rgba(187, 134, 252, 0.3)'
                }}>
                    {(() => {
                        const d = new Date(dateStr);
                        d.setMinutes(d.getMinutes() + d.getTimezoneOffset()); // Fix UTC shift
                        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                    })()}
                </div>
            </div>

            {/* Exercise List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    {!navigator.onLine && exercises.length === 0 ? (
                        <div style={{ color: 'var(--text-dim)' }}>
                            <h3>You are offline</h3>
                            <p>Connect to the internet to load this workout.</p>
                        </div>
                    ) : (
                        "Loading..."
                    )}
                </div>
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
                                isEditing={isEditing}
                            />
                        </div>
                    ))}

                    <button
                        className="button-secondary"
                        style={{ width: '100%', marginTop: '1rem', padding: '16px', border: '2px dashed var(--text-dim)', background: 'transparent', color: 'var(--text-dim)' }}
                        onClick={() => setShowAddExercise(true)}
                    >
                        + Add Exercise
                    </button>

                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            {isEditing ? 'Done Editing' : 'Edit Exercises'}
                        </button>
                    </div>
                    
                    <div style={{ marginTop: '1rem' }}>
                        <button
                            className="button-primary"
                            onClick={() => setShowSummaryModal(true)}
                            style={{ width: '100%', padding: '16px', fontSize: '1.1rem', background: 'var(--success-color)' }}
                        >
                            <Check size={20} /> Finish Workout
                        </button>
                    </div>
                </div>
            )}

            {showSummaryModal && (
                <WorkoutSummaryModal 
                    exercises={exercises} 
                    type={type} 
                    date={dateStr} 
                    split={split} 
                    onClose={() => setShowSummaryModal(false)} 
                />
            )}

            {/* Add Exercise Modal */}
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
                                <button className="button-primary" style={{ flex: 1, opacity: isAddingExercise ? 0.7 : 1 }} disabled={isAddingExercise}>
                                    {isAddingExercise ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

