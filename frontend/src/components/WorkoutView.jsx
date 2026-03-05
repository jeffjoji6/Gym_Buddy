import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getWorkout, logSet, updateSet, deleteSet, deleteExercise, startSession, endSession, updateExerciseNotes, getCompletedWeeks } from '../services/api';
import { ChevronLeft, ChevronDown, ChevronUp, Check, Trash2, Trophy, Clock, BarChart2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { useActiveSession } from '../context/ActiveSessionContext';
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
        if (navigator.vibrate) navigator.vibrate(20);
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

    const setsComplete = sets.length >= 3;

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
    const { addNotification } = useNotifications();
    const { setActiveSession, clearActiveSession } = useActiveSession();
    const navigate = useNavigate();

    const [completedWeeks, setCompletedWeeks] = useState(new Set());

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
    const [prToast, setPrToast] = useState(null);
    const [showAutoEnd, setShowAutoEnd] = useState(false);
    const hasAutoPrompted = useRef(false);

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

    // Load completed weeks for color coding
    useEffect(() => {
        if (!user || !type) return;
        getCompletedWeeks(user, type).then(setCompletedWeeks);
    }, [user, type]);

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

    // Auto-end detection: when all exercises have >= 3 sets
    useEffect(() => {
        if (!startTime || !sessionId || exercises.length === 0 || hasAutoPrompted.current) return;
        const allDone = exercises.every(ex => (ex.sets || []).length >= 3);
        if (allDone) {
            hasAutoPrompted.current = true;
            setShowAutoEnd(true);
            if (navigator.vibrate) navigator.vibrate(200);
        }
    }, [exercises, startTime, sessionId]);

    const handleLogSet = async (exerciseId, weight, reps) => {
        // Remind user to start workout if they haven't
        if (!startTime) {
            setShowStartReminder(true);
            return; // Don't log the set yet
        }

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
        // Register in global context so floating button appears on other pages
        setActiveSession({ type, week, split, startTime: now });
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
                clearActiveSession(); // Hide floating button on other pages
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
            {/* PR Blast Overlay */}
            {prToast && (
                <div className="pr-blast-overlay" onClick={() => setPrToast(null)}>
                    {/* Confetti particles */}
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
                        <div className="pr-blast-details">
                            {prToast.name}
                        </div>
                        <div className="pr-blast-weight">
                            {prToast.weight} kg
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', marginTop: '12px' }}>Tap to dismiss</div>
                    </div>
                </div>
            )}
            <div style={{ marginBottom: '16px' }}>
                {/* Top row: back + title + action */}
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <Link to="/" style={{ color: 'var(--text-color)', display: 'flex' }}>
                        <ChevronLeft size={28} />
                    </Link>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                        <h2 style={{ margin: 0, fontSize: '1.3rem', letterSpacing: '0.5px' }}>{type}</h2>
                    </div>
                    {!startTime ? (
                        <button
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(50);
                                handleStartWorkout();
                            }}
                            style={{
                                padding: '10px 20px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                background: 'var(--success-color)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 15px rgba(3, 218, 198, 0.3)'
                            }}
                        >
                            ▶ Start
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
                                handleFinishWorkout();
                            }}
                            disabled={finishing}
                            style={{
                                padding: '10px 16px',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(207, 102, 121, 0.15)',
                                color: 'var(--error-color)',
                                border: '1px solid rgba(207, 102, 121, 0.3)',
                                borderRadius: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            <Clock size={14} /> {formatTime(duration)}
                        </button>
                    )}
                </div>

                {/* Split toggle — locked while a session is running */}
                <div style={{ display: 'flex', gap: '0', marginBottom: '12px', background: 'var(--surface-highlight)', borderRadius: '10px', padding: '3px' }}>
                    {['A', 'B'].map(s => {
                        const isActive = split === s;
                        const isLocked = !!startTime && !isActive; // Lock inactive tab when session running
                        return (
                            <button
                                key={s}
                                disabled={isLocked}
                                onClick={() => {
                                    if (isLocked) return;
                                    if (navigator.vibrate) navigator.vibrate(10);
                                    setSearchParams(prev => { prev.set('split', s); return prev; });
                                }}
                                title={isLocked ? 'Cannot switch split during an active workout' : ''}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: isActive ? 'var(--primary-color)' : 'transparent',
                                    color: isActive ? '#000' : isLocked ? 'rgba(255,255,255,0.2)' : 'var(--text-dim)',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    cursor: isLocked ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isLocked ? 0.4 : 1
                                }}
                            >
                                Split {s === 'A' ? '1' : '2'} {isLocked ? '🔒' : ''}
                            </button>
                        );
                    })}
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
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                setSearchParams({ week: w });
                            }}
                            style={(() => {
                                const isCurrent = week === w;
                                const isDone = !isCurrent && completedWeeks.has(w);
                                return {
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    background: isCurrent ? 'var(--primary-color)' : isDone ? 'rgba(3, 218, 198, 0.12)' : 'var(--surface-highlight)',
                                    color: isCurrent ? '#000' : isDone ? 'var(--success-color)' : 'var(--text-color)',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    minWidth: '40px',
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    flexShrink: 0,
                                    border: isDone ? '1px solid rgba(3, 218, 198, 0.4)' : '1px solid transparent',
                                    boxShadow: isDone ? '0 0 8px rgba(3, 218, 198, 0.15)' : 'none'
                                };
                            })()}
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

            {/* Summary Screen — Full Page Redesign */}
            {showSummary && summaryData && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 3000,
                    background: 'var(--bg-color)',
                    overflowY: 'auto',
                    display: 'flex', flexDirection: 'column'
                }}>
                    {/* Hero gradient header */}
                    <div style={{
                        background: 'linear-gradient(160deg, #1a0533 0%, #0d1f2d 60%, #03dac6 200%)',
                        padding: '48px 24px 40px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* Background glow blobs */}
                        <div style={{
                            position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
                            width: '260px', height: '260px', borderRadius: '50%',
                            background: 'radial-gradient(circle, rgba(187,134,252,0.18) 0%, transparent 70%)',
                            pointerEvents: 'none'
                        }} />

                        {/* Animated trophy */}
                        <div style={{ fontSize: '4rem', marginBottom: '12px', animation: 'trophyBounce 0.7s ease-out' }}>🏆</div>
                        <h1 style={{
                            fontSize: '2.2rem', fontWeight: '900', margin: '0 0 6px',
                            background: 'linear-gradient(135deg, #fff 30%, var(--primary-color))',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            Workout Complete!
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', margin: '0 0 4px' }}>
                            Great job, <strong style={{ color: '#fff' }}>{user}</strong>! 💪
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.82rem', fontStyle: 'italic', margin: 0 }}>
                            "One step closer to your goals. Keep showing up."
                        </p>
                    </div>

                    {/* Stats section */}
                    <div style={{ padding: '24px 20px', flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
                            {/* Duration */}
                            <div style={{
                                background: 'var(--surface-color)',
                                border: '1px solid rgba(187,134,252,0.25)',
                                borderRadius: '18px', padding: '20px 16px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 20px rgba(187,134,252,0.08)'
                            }}>
                                <span style={{ fontSize: '1.6rem' }}>⏱️</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Duration</span>
                                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--primary-color)' }}>
                                    {Math.ceil((summaryData.duration_seconds || 0) / 60)}m
                                </span>
                            </div>

                            {/* Volume */}
                            <div style={{
                                background: 'var(--surface-color)',
                                border: '1px solid rgba(3,218,198,0.25)',
                                borderRadius: '18px', padding: '20px 16px',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                boxShadow: '0 4px 20px rgba(3,218,198,0.08)'
                            }}>
                                <span style={{ fontSize: '1.6rem' }}>⚡</span>
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Volume</span>
                                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--success-color)' }}>
                                    {summaryData.total_volume >= 1000
                                        ? `${(summaryData.total_volume / 1000).toFixed(1)}k`
                                        : summaryData.total_volume}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '-4px' }}>kg</span>
                            </div>
                        </div>

                        {/* PRs section */}
                        {summaryData.prs && summaryData.prs.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '1.1rem' }}>🥇</span>
                                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>New Records Broken</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {summaryData.prs.map((pr, i) => (
                                        <div key={i} style={{
                                            background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,160,0,0.05))',
                                            border: '1px solid rgba(255,215,0,0.3)',
                                            borderRadius: '12px', padding: '12px 16px',
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            boxShadow: '0 2px 12px rgba(255,215,0,0.08)'
                                        }}>
                                            <span style={{ fontSize: '1rem' }}>🏅</span>
                                            <span style={{ color: '#ffd166', fontWeight: '600', fontSize: '0.9rem' }}>{pr}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <span style={{ fontSize: '1rem' }}>📝</span>
                                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>How did it feel?</span>
                            </div>
                            <textarea
                                value={finishNotes}
                                onChange={e => setFinishNotes(e.target.value)}
                                placeholder="Add notes about this session..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    background: 'var(--surface-color)',
                                    border: '1px solid var(--surface-highlight)',
                                    borderRadius: '14px', padding: '14px',
                                    color: 'var(--text-color)', fontSize: '0.95rem',
                                    resize: 'none', boxSizing: 'border-box',
                                    outline: 'none', fontFamily: 'inherit',
                                    lineHeight: '1.5'
                                }}
                            />
                            {/* Emoji mood picker */}
                            <div style={{
                                display: 'flex', justifyContent: 'center', gap: '16px',
                                marginTop: '12px'
                            }}>
                                {['😤', '💪', '😊', '😮‍💨', '🥵'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => setFinishNotes(prev => prev ? `${prev} ${emoji}` : emoji)}
                                        style={{
                                            background: 'var(--surface-highlight)', border: 'none',
                                            borderRadius: '10px', padding: '8px 10px',
                                            fontSize: '1.4rem', cursor: 'pointer',
                                            transition: 'transform 0.1s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Done button */}
                        <button
                            onClick={closeSummary}
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--success-color))',
                                border: 'none', color: '#000',
                                fontSize: '1.05rem', fontWeight: '800',
                                cursor: 'pointer', letterSpacing: '0.03em',
                                boxShadow: '0 4px 20px rgba(187,134,252,0.35)',
                                marginBottom: '24px'
                            }}
                        >
                            Back to Home 🚀
                        </button>
                    </div>
                </div>
            )}

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

            {/* Auto-End Banner */}
            {showAutoEnd && (
                <div className="auto-end-banner">
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>🎉 All exercises done!</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Ready to finish your workout?</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setShowAutoEnd(false)}
                            style={{
                                background: 'rgba(0,0,0,0.2)',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Keep Going
                        </button>
                        <button
                            onClick={() => {
                                setShowAutoEnd(false);
                                handleFinishWorkout();
                            }}
                            style={{
                                background: '#000',
                                color: 'var(--success-color)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                fontWeight: '700',
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Finish Workout
                        </button>
                    </div>
                </div>
            )}
        </div >
    );
}
