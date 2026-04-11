import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTimer } from '../context/TimerContext';
import { X, Play, Square, Timer as TimerIcon, Mic, MicOff, RotateCcw, Volume2 } from 'lucide-react';

// ─── Web Audio beep generator ──────────────────────────────────────────────
const audioCtxRef = { current: null };
function getAudioCtx() {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
}

function playBeep(frequency = 880, durationMs = 120, volume = 0.3) {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency;
        gain.gain.value = volume;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
        osc.stop(ctx.currentTime + durationMs / 1000 + 0.05);
    } catch (e) { /* silent fallback */ }
}

function playStartSound() { playBeep(784, 100, 0.25); setTimeout(() => playBeep(1047, 150, 0.3), 120); }
function playStopSound() { playBeep(523, 200, 0.25); }
function playResetSound() { playBeep(440, 80, 0.15); setTimeout(() => playBeep(330, 80, 0.15), 100); }

// ─── Component ─────────────────────────────────────────────────────────────
export default function GlobalTimer() {
    const { mode, duration, elapsed, motivation, startStopwatch, startCountdown, closeTimer } = useTimer();
    const [cdInput, setCdInput] = useState(60);

    // ── Stopwatch state ───────────────────────────────────────────────────
    const [swRunning, setSwRunning] = useState(false);
    const [swElapsed, setSwElapsed] = useState(0);
    const swStartRef = useRef(null);
    const swRafRef = useRef(null);

    // ── Voice state ───────────────────────────────────────────────────────
    const recognitionRef = useRef(null);
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [voiceListening, setVoiceListening] = useState(false);
    const [voiceFeedback, setVoiceFeedback] = useState('');
    const voiceFeedbackTimeout = useRef(null);

    // Refs for latest state in callbacks
    const swRunningRef = useRef(swRunning);
    const swElapsedRef = useRef(swElapsed);
    useEffect(() => { swRunningRef.current = swRunning; }, [swRunning]);
    useEffect(() => { swElapsedRef.current = swElapsed; }, [swElapsed]);

    // ── Stopwatch actions ─────────────────────────────────────────────────
    const updateSw = useCallback(() => {
        if (!swStartRef.current) return;
        setSwElapsed(Date.now() - swStartRef.current);
        swRafRef.current = requestAnimationFrame(updateSw);
    }, []);

    const handleSwStart = useCallback(() => {
        if (swRunningRef.current) return;
        swStartRef.current = Date.now() - swElapsedRef.current;
        setSwRunning(true);
        swRafRef.current = requestAnimationFrame(updateSw);
        playStartSound();
        showVoiceFeedback('▶ Started');
    }, [updateSw]);

    const handleSwStop = useCallback(() => {
        if (!swRunningRef.current) return;
        setSwRunning(false);
        if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        setSwElapsed(Date.now() - swStartRef.current);
        playStopSound();
        showVoiceFeedback('⏸ Stopped');
    }, []);

    const handleSwReset = useCallback(() => {
        setSwRunning(false);
        setSwElapsed(0);
        swStartRef.current = null;
        if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        playResetSound();
        showVoiceFeedback('↺ Reset');
    }, []);

    function showVoiceFeedback(msg) {
        setVoiceFeedback(msg);
        if (voiceFeedbackTimeout.current) clearTimeout(voiceFeedbackTimeout.current);
        voiceFeedbackTimeout.current = setTimeout(() => setVoiceFeedback(''), 2500);
    }

    // ── Close handler ─────────────────────────────────────────────────────
    const handleClose = useCallback(() => {
        if (swRunningRef.current) {
            setSwRunning(false);
            if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        }
        setSwElapsed(0);
        swStartRef.current = null;
        stopVoice();
        closeTimer();
    }, [closeTimer]);

    // ── Voice recognition (toggle-based, much more reliable) ──────────────
    const startVoice = useCallback(() => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRec) {
            showVoiceFeedback('Voice not supported');
            return;
        }

        // Stop any existing instance
        if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch(e) {}
            recognitionRef.current = null;
        }

        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.maxAlternatives = 3;

        rec.onresult = (e) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
                // Process only final results for action
                if (!e.results[i].isFinal) continue;

                // Check all alternatives for better accuracy
                for (let j = 0; j < e.results[i].length; j++) {
                    const t = e.results[i][j].transcript.trim().toLowerCase();
                    if (t.includes('start') || t.includes('go') || t.includes('begin')) {
                        handleSwStart();
                        return;
                    }
                    if (t.includes('stop') || t.includes('pause') || t.includes('hold')) {
                        handleSwStop();
                        return;
                    }
                    if (t.includes('reset') || t.includes('clear') || t.includes('restart')) {
                        handleSwReset();
                        return;
                    }
                }
            }
        };

        rec.onstart = () => setVoiceListening(true);
        rec.onerror = (e) => {
            if (e.error === 'not-allowed') {
                showVoiceFeedback('Microphone blocked');
                setVoiceEnabled(false);
            }
            setVoiceListening(false);
        };
        rec.onend = () => {
            setVoiceListening(false);
            // Auto-restart only if voice is still enabled
            if (recognitionRef.current) {
                setTimeout(() => {
                    if (recognitionRef.current) {
                        try { recognitionRef.current.start(); } catch(e) {}
                    }
                }, 300);
            }
        };

        try {
            rec.start();
            recognitionRef.current = rec;
            setVoiceEnabled(true);
            playBeep(1200, 60, 0.15);
            showVoiceFeedback('🎤 Listening… say "start", "stop", or "reset"');
        } catch(e) {
            showVoiceFeedback('Could not start mic');
        }
    }, [handleSwStart, handleSwStop, handleSwReset]);

    const stopVoice = useCallback(() => {
        if (recognitionRef.current) {
            const old = recognitionRef.current;
            recognitionRef.current = null;
            try { old.abort(); } catch(e) {}
        }
        setVoiceEnabled(false);
        setVoiceListening(false);
    }, []);

    const toggleVoice = useCallback(() => {
        if (voiceEnabled) {
            stopVoice();
            showVoiceFeedback('🔇 Voice off');
        } else {
            startVoice();
        }
    }, [voiceEnabled, startVoice, stopVoice]);

    // Cleanup on unmount / mode change
    useEffect(() => {
        if (mode !== 'stopwatch') {
            stopVoice();
            if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        }
    }, [mode, stopVoice]);

    useEffect(() => {
        return () => {
            stopVoice();
            if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        };
    }, [stopVoice]);

    // ── Keyboard support ──────────────────────────────────────────────────
    useEffect(() => {
        if (mode !== 'stopwatch') return;
        const handler = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                swRunningRef.current ? handleSwStop() : handleSwStart();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                handleSwReset();
            }
            if (e.code === 'Escape') {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [mode, handleSwStart, handleSwStop, handleSwReset, handleClose]);

    // ── Render nothing if hidden ──────────────────────────────────────────
    if (mode === 'hidden') return null;

    // ═══════════════════════════════════════════════════════════════════════
    // FULLSCREEN STOPWATCH (Apple Clock inspired)
    // ═══════════════════════════════════════════════════════════════════════
    if (mode === 'stopwatch') {
        const totalMs = swElapsed;
        const cs = Math.floor((totalMs % 1000) / 10);
        const s = Math.floor((totalMs / 1000) % 60);
        const m = Math.floor((totalMs / 60000) % 60);
        const h = Math.floor(totalMs / 3600000);

        const timeLabel = h > 0
            ? `${h} hours ${m} minutes ${s} seconds`
            : `${m} minutes ${s} seconds`;

        return (
            <div
                role="application"
                aria-label="Stopwatch"
                style={{
                    position: 'fixed', inset: 0,
                    background: '#000', color: '#fff', zIndex: 10000,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, sans-serif',
                    userSelect: 'none', touchAction: 'manipulation',
                    overflow: 'hidden'
                }}
            >
                {/* ── Header ──────────────────────────────────────────── */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    padding: '16px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
                    zIndex: 1
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        fontSize: '1rem', color: 'rgba(255,255,255,0.6)', fontWeight: '500'
                    }}>
                        <TimerIcon size={18} aria-hidden="true" />
                        <span>Stopwatch</span>
                    </div>

                    <button
                        onClick={handleClose}
                        aria-label="Close stopwatch"
                        style={{
                            background: 'rgba(255,255,255,0.12)', border: 'none',
                            borderRadius: '50%', width: '36px', height: '36px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', cursor: 'pointer', transition: 'background 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Voice feedback toast ─────────────────────────────── */}
                <div
                    aria-live="polite"
                    aria-atomic="true"
                    style={{
                        position: 'absolute', top: '70px',
                        padding: '8px 20px', borderRadius: '20px',
                        background: voiceFeedback ? 'rgba(255,255,255,0.12)' : 'transparent',
                        color: voiceListening ? '#34c759' : 'rgba(255,255,255,0.7)',
                        fontSize: '0.9rem', fontWeight: '500',
                        transition: 'all 0.3s ease',
                        opacity: voiceFeedback ? 1 : 0,
                        transform: voiceFeedback ? 'translateY(0)' : 'translateY(-8px)',
                        pointerEvents: 'none'
                    }}
                >
                    {voiceFeedback}
                </div>

                {/* ── Time display ─────────────────────────────────────── */}
                <div
                    role="timer"
                    aria-label={timeLabel}
                    aria-live="off"
                    style={{
                        display: 'flex', alignItems: 'baseline',
                        marginBottom: '12vh',
                        lineHeight: 1,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: '100',
                        letterSpacing: '1px'
                    }}
                >
                    {h > 0 && (
                        <>
                            <span style={{ fontSize: 'clamp(3rem, 12vw, 5.5rem)' }}>{h.toString().padStart(2, '0')}</span>
                            <span style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', color: 'rgba(255,255,255,0.35)', margin: '0 4px' }}>:</span>
                        </>
                    )}
                    <span style={{ fontSize: 'clamp(3rem, 12vw, 5.5rem)' }}>
                        {m.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', color: 'rgba(255,255,255,0.35)', margin: '0 4px' }}>:</span>
                    <span style={{ fontSize: 'clamp(3rem, 12vw, 5.5rem)' }}>
                        {s.toString().padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)', color: 'rgba(255,255,255,0.45)', margin: '0 2px' }}>.</span>
                    <span style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)', color: 'rgba(255,255,255,0.45)' }}>
                        {cs.toString().padStart(2, '0')}
                    </span>
                </div>

                {/* ── Control buttons ──────────────────────────────────── */}
                <div style={{
                    display: 'flex', alignItems: 'center',
                    gap: 'clamp(30px, 8vw, 60px)'
                }}>
                    {/* Reset */}
                    <button
                        onClick={handleSwReset}
                        aria-label="Reset stopwatch"
                        disabled={swElapsed === 0}
                        style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.08)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            color: swElapsed === 0 ? 'rgba(255,255,255,0.25)' : '#fff',
                            fontSize: '0.95rem', fontWeight: '400',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '4px',
                            cursor: swElapsed === 0 ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <RotateCcw size={20} aria-hidden="true" />
                        <span style={{ fontSize: '0.7rem' }}>Reset</span>
                    </button>

                    {/* Start / Stop */}
                    {swRunning ? (
                        <button
                            onClick={handleSwStop}
                            aria-label="Stop stopwatch"
                            style={{
                                width: '88px', height: '88px', borderRadius: '50%',
                                background: 'rgba(255, 59, 48, 0.2)',
                                border: '3px solid #ff3b30',
                                color: '#ff3b30',
                                fontSize: '0.95rem', fontWeight: '500',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: '4px',
                                cursor: 'pointer', transition: 'all 0.15s',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                        >
                            <Square size={26} fill="#ff3b30" aria-hidden="true" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSwStart}
                            aria-label="Start stopwatch"
                            autoFocus
                            style={{
                                width: '88px', height: '88px', borderRadius: '50%',
                                background: 'rgba(52, 199, 89, 0.2)',
                                border: '3px solid #34c759',
                                color: '#34c759',
                                fontSize: '0.95rem', fontWeight: '500',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', gap: '4px',
                                cursor: 'pointer', transition: 'all 0.15s',
                                WebkitTapHighlightColor: 'transparent'
                            }}
                        >
                            <Play size={26} fill="#34c759" aria-hidden="true" style={{ marginLeft: '4px' }} />
                        </button>
                    )}

                    {/* Voice toggle */}
                    <button
                        onClick={toggleVoice}
                        aria-label={voiceEnabled ? 'Disable voice control' : 'Enable voice control'}
                        aria-pressed={voiceEnabled}
                        style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: voiceEnabled
                                ? (voiceListening ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 159, 10, 0.15)')
                                : 'rgba(255,255,255,0.08)',
                            border: `2px solid ${voiceEnabled
                                ? (voiceListening ? '#34c759' : '#ff9f0a')
                                : 'rgba(255,255,255,0.2)'}`,
                            color: voiceEnabled
                                ? (voiceListening ? '#34c759' : '#ff9f0a')
                                : 'rgba(255,255,255,0.5)',
                            fontSize: '0.95rem', fontWeight: '400',
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center', gap: '4px',
                            cursor: 'pointer', transition: 'all 0.2s',
                            WebkitTapHighlightColor: 'transparent',
                            position: 'relative'
                        }}
                    >
                        {voiceEnabled ? <Mic size={20} aria-hidden="true" /> : <MicOff size={20} aria-hidden="true" />}
                        <span style={{ fontSize: '0.65rem' }}>Voice</span>

                        {/* Active pulse indicator */}
                        {voiceListening && (
                            <div style={{
                                position: 'absolute', top: '6px', right: '6px',
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: '#34c759',
                                animation: 'pulse 1.5s ease-in-out infinite'
                            }} />
                        )}
                    </button>
                </div>

                {/* ── Keyboard hint ────────────────────────────────────── */}
                <div
                    aria-hidden="true"
                    style={{
                        position: 'absolute', bottom: '30px',
                        display: 'flex', gap: '16px',
                        color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem'
                    }}
                >
                    <span>Space — Start / Stop</span>
                    <span>R — Reset</span>
                    <span>Esc — Close</span>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REST TIMER / COUNTDOWN / STANDBY (compact bottom sheet)
    // ═══════════════════════════════════════════════════════════════════════
    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const remaining = Math.max(0, duration - elapsed);
    const displayTime = (mode === 'rest' || mode === 'countdown') ? formatTime(remaining) : formatTime(elapsed);
    const progress = (mode === 'rest' || mode === 'countdown') ? ((elapsed / duration) * 100) : 0;
    const is10s = (mode === 'rest' || mode === 'countdown') && remaining <= 10 && remaining > 0;

    return (
        <div
            role="alert"
            aria-label={mode === 'standby' ? 'Timer panel' : `${mode} timer: ${displayTime}`}
            style={{
                position: 'fixed',
                bottom: '24px', left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: '90%', maxWidth: '400px',
                background: is10s ? '#ff3b30' : 'var(--surface-color)',
                border: `1px solid ${is10s ? '#ff3b30' : 'var(--surface-highlight)'}`,
                borderRadius: '16px',
                boxShadow: is10s
                    ? '0 0 30px rgba(255,59,48,0.5)'
                    : '0 10px 40px rgba(0,0,0,0.5)',
                transition: 'background 0.3s, box-shadow 0.3s',
                overflow: 'hidden'
            }}
        >
            {(mode === 'rest' || mode === 'countdown') && (
                <div
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{
                        position: 'absolute',
                        bottom: 0, left: 0, height: '4px',
                        background: 'var(--primary-color)',
                        width: `${progress}%`,
                        transition: 'width 1s linear'
                    }}
                />
            )}

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TimerIcon size={18} color={is10s ? '#fff' : 'var(--primary-color)'} aria-hidden="true" />
                        <span style={{
                            fontWeight: 'bold', fontSize: '0.9rem',
                            color: is10s ? '#fff' : 'var(--text-dim)',
                            textTransform: 'uppercase'
                        }}>
                            {mode === 'standby' ? 'Timer Panel' : mode === 'rest' ? 'Rest Time' : 'Countdown'}
                        </span>
                    </div>
                    <button
                        onClick={closeTimer}
                        aria-label="Close timer"
                        style={{
                            background: 'transparent', border: 'none',
                            color: is10s ? '#fff' : 'var(--text-dim)',
                            cursor: 'pointer', display: 'flex', padding: '4px'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {mode === 'standby' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                        <button
                            className="button-primary"
                            onClick={startStopwatch}
                            aria-label="Start stopwatch"
                            style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '14px' }}
                        >
                            <Play size={18} aria-hidden="true" /> Start Stopwatch
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="number"
                                value={cdInput}
                                onChange={e => setCdInput(parseInt(e.target.value) || 0)}
                                aria-label="Countdown duration in seconds"
                                min={1}
                                style={{ width: '80px', textAlign: 'center' }}
                            />
                            <button
                                className="button-secondary"
                                onClick={() => startCountdown(cdInput)}
                                aria-label={`Start ${cdInput} second countdown`}
                                style={{ flex: 1 }}
                            >
                                Start Countdown (s)
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div
                            role="timer"
                            aria-live="polite"
                            style={{
                                fontSize: '3rem', fontWeight: '900',
                                fontVariantNumeric: 'tabular-nums',
                                lineHeight: 1,
                                color: is10s ? '#fff' : 'var(--text-color)',
                                animation: is10s ? 'pulse 1s infinite' : 'none'
                            }}
                        >
                            {displayTime}
                        </div>
                        {mode === 'rest' && remaining > 0 && (
                            <div style={{
                                fontSize: '0.9rem',
                                color: is10s ? 'rgba(255,255,255,0.8)' : 'var(--primary-color)',
                                marginTop: '8px', fontWeight: 'bold', fontStyle: 'italic'
                            }}>
                                "{motivation}"
                            </div>
                        )}
                        {mode === 'rest' && remaining <= 0 && (
                            <div style={{
                                fontSize: '1rem',
                                color: is10s ? '#fff' : 'var(--primary-color)',
                                marginTop: '8px', fontWeight: 'bold'
                            }}>
                                Back to work! 🚀
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
