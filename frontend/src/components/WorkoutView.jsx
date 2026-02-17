import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getWorkout, logSet, updateSet, deleteSet, parseCommand, startSession, endSession, updateExerciseNotes } from '../services/api';
import { ChevronLeft, ChevronDown, Mic, Check, Trash2, Trophy, Clock, BarChart2, Activity } from 'lucide-react';
import { useUser } from '../context/UserContext';
import EditSetModal from './EditSetModal';
import { useNavigate } from 'react-router-dom';

const ExerciseCard = ({ exercise, onLog, onUpdate, onDelete, onDeleteExercise, week, isEditing, onUpdateNotes, workoutType, user, split }) => {
    const [expanded, setExpanded] = useState(false);
    const [notesExpanded, setNotesExpanded] = useState(false);
    const sets = exercise.sets || [];

    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [notes, setNotes] = useState(exercise.setup_notes || '');

    const [editingSet, setEditingSet] = useState(null);
    const [justLogged, setJustLogged] = useState(false);

    const handleLog = async () => {
        if (!weight || !reps) return;
        await onLog(exercise.name, weight, reps);
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
                    {exercise.prev_week_summary && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Last: {exercise.prev_week_summary}</span>
                    )}
                    {onDeleteExercise && isEditing && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Delete exercise "${exercise.name}"?`)) {
                                    onDeleteExercise(exercise.name);
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
                    onClick={() => setNotesExpanded(!notesExpanded)}
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '8px 0'
                    }}
                >
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)', fontWeight: '500' }}>
                        Setup Notes
                    </span>
                    <ChevronDown
                        size={18}
                        style={{
                            transform: notesExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            color: 'var(--text-dim)'
                        }}
                    />
                </div>

                {notesExpanded && (
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
                                await onUpdateNotes(exercise.name, notes);
                            }}
                            className="button-secondary"
                            style={{
                                marginTop: '0.5rem',
                                width: '100%',
                                fontSize: '0.85rem',
                                padding: '8px'
                            }}
                        >
                            Save Notes
                        </button>
                    </div>
                )}
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
};

export default function WorkoutView() {
    const { type } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const week = parseInt(searchParams.get('week') || '1');
    const split = searchParams.get('split') || 'A';
    const { user } = useUser();
    const navigate = useNavigate();

    const [exercises, setExercises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listening, setListening] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState('');
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
    const [showStartReminder, setShowStartReminder] = useState(false);

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
            // Only show full loading spinner on initial mount or type change, not on minor updates like logging a set
            if (exercises.length === 0) setLoading(true);
            try {
                const data = await getWorkout(type, week, user, split);
                setExercises(data.exercises);
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

    const handleLogSet = async (exerciseName, weight, reps) => {
        // Remind user to start workout if they haven't
        if (!startTime) {
            setShowStartReminder(true);
            return; // Don't log the set yet
        }

        await logSet({
            workout_type: type,
            exercise_name: exerciseName,
            weight: parseFloat(weight),
            reps: parseInt(reps),
            week: week,
            user: user
        });
        setTrigger(t => t + 1);
    };

    const handleStartReminderConfirm = async () => {
        setShowStartReminder(false);
        await handleStartWorkout();
    };

    const handleUpdateSet = async (id, weight, reps) => {
        await updateSet({
            set_id: id,
            weight: weight,
            reps: reps,
            user: user
        });
        setTrigger(t => t + 1);
    };

    const handleDeleteSet = async (id) => {
        await deleteSet({
            set_id: id,
            user: user
        });
        setTrigger(t => t + 1);
    };

    const handleAddExercise = async (e) => {
        e.preventDefault();
        if (newExerciseName.trim()) {
            const { addExercise } = await import('../services/api');
            await addExercise(type, newExerciseName.trim(), user, split);
            setTrigger(t => t + 1);
            setShowAddExercise(false);
            setNewExerciseName('');
        }
    };

    const speak = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Browser does not support speech recognition.");
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setListening(true);
            setVoiceStatus('Listening...');
        };

        recognition.onend = () => {
            setListening(false);
            setVoiceStatus('');
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            setVoiceStatus(`Heard: "${transcript}"`);

            try {
                const result = await parseCommand(transcript, type, user);
                if (result.success && result.data) {
                    const { exercise, weight, reps } = result.data;
                    speak(`Logging ${weight} kilos for ${reps} reps on ${exercise}`);
                    await handleLogSet(exercise, weight, reps);
                } else {
                    speak("Sorry, I didn't catch that.");
                    setVoiceStatus(`Error: ${result.message}`);
                }
            } catch (e) {
                console.error(e);
                speak("Something went wrong.");
            }
        };

        recognition.start();
    };

    const handleDeleteExercise = async (exerciseName) => {
        const { deleteExercise } = await import('../services/api');
        await deleteExercise(type, exerciseName, user);
        setTrigger(t => t + 1);
    };

    const handleUpdateNotes = async (exerciseName, setupNotes) => {
        await updateExerciseNotes(type, exerciseName, setupNotes, user, split);
        setTrigger(t => t + 1);
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
        setFinishing(true);
        try {
            const res = await endSession(sessionId, user, finishNotes);
            if (res.success) {
                setSummaryData(res);
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
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                            Split {split === 'A' ? '1' : '2'}
                        </div>
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

            {voiceStatus && (
                <div style={{
                    background: 'var(--surface-highlight)',
                    padding: '8px',
                    textAlign: 'center',
                    marginBottom: '1rem',
                    borderRadius: '8px'
                }} className="animate-slide-up">
                    {voiceStatus}
                </div>
            )}

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
                        <div key={ex.id} className="animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
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

            <div
                onClick={startListening}
                style={{
                    position: 'fixed',
                    bottom: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: listening ? 'var(--error-color)' : 'var(--primary-color)',
                    borderRadius: '50%',
                    width: '72px',
                    height: '72px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    cursor: 'pointer',
                    zIndex: 100,
                    transition: 'background 0.3s, transform 0.2s'
                }}
                className="animate-slide-up"
            >
                {listening ? <Activity color="#fff" size={32} className="animate-wiggle" /> : <Mic size={36} color="#000" />}
            </div>

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
                                <button className="button-primary" style={{ flex: 1 }}>Add</button>
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
                                <p style={{ color: 'var(--text-dim)' }}>Great job, {user?.username}!</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '2rem' }}>
                                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px' }}>
                                    <Clock size={24} color="var(--primary-color)" style={{ marginBottom: '8px' }} />
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>Duration</span>
                                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{summaryData.duration_minutes}m</span>
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
