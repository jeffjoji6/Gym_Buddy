import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTimer } from '../context/TimerContext';
import { X, Play, Square, Timer as TimerIcon, RotateCcw, Flag } from 'lucide-react';

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
function playStopSound()  { playBeep(523, 200, 0.25); }
function playResetSound() { playBeep(440, 80, 0.15); setTimeout(() => playBeep(330, 80, 0.15), 100); }
function playLapSound()   { playBeep(660, 80, 0.18); }

// ─── Apple-style scroll wheel picker ───────────────────────────────────────
const ITEM_H = 48;

function ScrollPicker({ count, value, onChange, label }) {
    const listRef = useRef(null);
    const isTouching = useRef(false);
    const isScrolling = useRef(false);

    // Snap to the selected value on mount and when value changes externally
    useEffect(() => {
        if (listRef.current && !isTouching.current && !isScrolling.current) {
            listRef.current.scrollTop = value * ITEM_H;
        }
    }, [value]);

    const handleScroll = useCallback(() => {
        if (!listRef.current) return;
        isScrolling.current = true;
        const idx = Math.round(listRef.current.scrollTop / ITEM_H);
        const clamped = Math.max(0, Math.min(count - 1, idx));
        onChange(clamped);
        clearTimeout(listRef._scrollEnd);
        listRef._scrollEnd = setTimeout(() => { isScrolling.current = false; }, 150);
    }, [count, onChange]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.65rem', letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                {label}
            </span>
            <div style={{ position: 'relative', width: '80px', height: ITEM_H * 3 }}>
                {/* Fade top */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_H, background: 'linear-gradient(to bottom, rgba(13,13,26,1) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />
                {/* Selection highlight */}
                <div style={{
                    position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H,
                    border: '1px solid rgba(187,134,252,0.25)',
                    borderRadius: '8px',
                    background: 'rgba(187,134,252,0.08)',
                    zIndex: 1, pointerEvents: 'none'
                }} />
                {/* Fade bottom */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_H, background: 'linear-gradient(to top, rgba(13,13,26,1) 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' }} />

                <div
                    ref={listRef}
                    onScroll={handleScroll}
                    onTouchStart={() => { isTouching.current = true; }}
                    onTouchEnd={() => { isTouching.current = false; }}
                    style={{
                        position: 'absolute', inset: 0, overflowY: 'scroll',
                        scrollSnapType: 'y mandatory',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        paddingTop: ITEM_H,
                        paddingBottom: ITEM_H,
                    }}
                >
                    <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                    {Array.from({ length: count }, (_, i) => (
                        <div
                            key={i}
                            onClick={() => {
                                onChange(i);
                                if (listRef.current) listRef.current.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
                            }}
                            style={{
                                height: ITEM_H,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                scrollSnapAlign: 'start',
                                fontSize: i === value ? '2rem' : '1.4rem',
                                fontWeight: i === value ? '200' : '200',
                                color: i === value ? '#fff' : 'rgba(255,255,255,0.2)',
                                fontVariantNumeric: 'tabular-nums',
                                transition: 'font-size 0.15s ease, color 0.15s ease',
                                cursor: 'pointer',
                                userSelect: 'none',
                                letterSpacing: '1px',
                            }}
                        >
                            {i.toString().padStart(2, '0')}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function GlobalTimer() {
    const { mode, duration, elapsed, motivation, startStopwatch, startCountdown, closeTimer } = useTimer();

    // Countdown picker state (minutes + seconds)
    const [cdMinutes, setCdMinutes] = useState(1);
    const [cdSeconds, setCdSeconds] = useState(30);

    // ── Stopwatch state ───────────────────────────────────────────────────
    const [swRunning, setSwRunning] = useState(false);
    const [swElapsed, setSwElapsed] = useState(0);
    const [laps, setLaps] = useState([]);
    const swStartRef = useRef(null);
    const swRafRef = useRef(null);

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
    }, [updateSw]);

    const handleSwStop = useCallback(() => {
        if (!swRunningRef.current) return;
        setSwRunning(false);
        if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        setSwElapsed(Date.now() - swStartRef.current);
        playStopSound();
    }, []);

    const handleSwReset = useCallback(() => {
        setSwRunning(false);
        setSwElapsed(0);
        setLaps([]);
        swStartRef.current = null;
        if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        playResetSound();
    }, []);

    const handleLap = useCallback(() => {
        if (!swRunningRef.current && swElapsedRef.current === 0) return;
        const elapsed = swElapsedRef.current;
        setLaps(prev => {
            const prevTotal = prev.length > 0 ? prev[prev.length - 1].total : 0;
            const split = elapsed - prevTotal;
            return [...prev, { total: elapsed, split, index: prev.length + 1 }];
        });
        playLapSound();
        if (navigator.vibrate) navigator.vibrate(30);
    }, []);

    // ── Close handler ─────────────────────────────────────────────────────
    const handleClose = useCallback(() => {
        if (swRunningRef.current) {
            setSwRunning(false);
            if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        }
        setSwElapsed(0);
        setLaps([]);
        swStartRef.current = null;
        closeTimer();
    }, [closeTimer]);

    // Cleanup on unmount / mode change
    useEffect(() => {
        if (mode !== 'stopwatch') {
            if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        }
    }, [mode]);

    useEffect(() => {
        return () => {
            if (swRafRef.current) cancelAnimationFrame(swRafRef.current);
        };
    }, []);

    // ── Keyboard support ──────────────────────────────────────────────────
    useEffect(() => {
        if (mode !== 'stopwatch') return;
        const handler = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                swRunningRef.current ? handleSwStop() : handleSwStart();
            }
            if (e.code === 'KeyR') { e.preventDefault(); handleSwReset(); }
            if (e.code === 'KeyL') { e.preventDefault(); handleLap(); }
            if (e.code === 'Escape') { e.preventDefault(); handleClose(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [mode, handleSwStart, handleSwStop, handleSwReset, handleLap, handleClose]);

    // ── Render nothing if hidden ──────────────────────────────────────────
    if (mode === 'hidden') return null;

    // ═══════════════════════════════════════════════════════════════════════
    // FULLSCREEN STOPWATCH
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

        const circumference = 2 * Math.PI * 140;
        const strokeDashoffset = circumference - ((s + cs / 100) / 60) * circumference;

        const formatMs = (ms) => {
            const s = Math.floor((ms / 1000) % 60);
            const m = Math.floor((ms / 60000) % 60);
            const cs = Math.floor((ms % 1000) / 10);
            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
        };

        return (
            <div
                role="application"
                aria-label="Stopwatch"
                style={{
                    position: 'fixed', inset: 0,
                    background: 'linear-gradient(160deg, #0a0a0f 0%, #0d0d1a 40%, #12101f 100%)',
                    color: '#fff', zIndex: 10000,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                    userSelect: 'none', touchAction: 'manipulation',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0,
                    padding: '16px 20px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    zIndex: 1
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)',
                        fontWeight: '400', letterSpacing: '2px', textTransform: 'uppercase'
                    }}>
                        <TimerIcon size={14} />
                        <span>Stopwatch</span>
                    </div>
                    <button
                        onClick={handleClose}
                        aria-label="Close"
                        style={{
                            background: 'rgba(255,255,255,0.06)', border: 'none',
                            borderRadius: '50%', width: '34px', height: '34px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255,255,255,0.5)', cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Ring + Time */}
                <div style={{
                    position: 'relative', width: '300px', height: '300px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: laps.length > 0 ? '4vh' : '8vh'
                }}>
                    <svg width="300" height="300" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                        <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(187,134,252,0.07)" strokeWidth="3" />
                        <circle
                            cx="150" cy="150" r="140" fill="none"
                            stroke={swRunning ? '#bb86fc' : 'rgba(187,134,252,0.25)'}
                            strokeWidth="3"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            style={{
                                transition: swRunning ? 'stroke-dashoffset 0.1s linear' : 'none',
                                filter: swRunning ? 'drop-shadow(0 0 8px rgba(187,134,252,0.5))' : 'none'
                            }}
                        />
                    </svg>

                    <div
                        role="timer"
                        aria-label={timeLabel}
                        aria-live="off"
                        style={{ display: 'flex', alignItems: 'baseline', fontVariantNumeric: 'tabular-nums', fontWeight: '200', letterSpacing: '2px' }}
                    >
                        {h > 0 && (
                            <>
                                <span style={{ fontSize: 'clamp(2.2rem, 9vw, 4rem)' }}>{h.toString().padStart(2, '0')}</span>
                                <span style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)', color: 'rgba(187,134,252,0.4)', margin: '0 2px' }}>:</span>
                            </>
                        )}
                        <span style={{ fontSize: 'clamp(2.2rem, 9vw, 4rem)' }}>{m.toString().padStart(2, '0')}</span>
                        <span style={{ fontSize: 'clamp(1.2rem, 5vw, 2rem)', color: 'rgba(187,134,252,0.4)', margin: '0 2px' }}>:</span>
                        <span style={{ fontSize: 'clamp(2.2rem, 9vw, 4rem)' }}>{s.toString().padStart(2, '0')}</span>
                        <span style={{ fontSize: 'clamp(0.9rem, 3.5vw, 1.6rem)', color: 'rgba(255,255,255,0.28)', marginLeft: '3px' }}>
                            .{cs.toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                {/* Lap list (last 3 laps, newest on top) */}
                {laps.length > 0 && (
                    <div style={{
                        width: '220px', marginBottom: '4vh',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                        {[...laps].reverse().slice(0, 3).map(lap => (
                            <div key={lap.index} style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '5px 12px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)',
                                fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums'
                            }}>
                                <span style={{ color: 'rgba(187,134,252,0.6)' }}>Lap {lap.index}</span>
                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{formatMs(lap.split)}</span>
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>{formatMs(lap.total)}</span>
                            </div>
                        ))}
                        {laps.length > 3 && (
                            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'rgba(255,255,255,0.18)' }}>
                                +{laps.length - 3} more
                            </div>
                        )}
                    </div>
                )}

                {/* Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(20px, 5vw, 44px)' }}>
                    {/* Reset */}
                    <button
                        onClick={handleSwReset}
                        aria-label="Reset"
                        disabled={swElapsed === 0}
                        style={{
                            width: '68px', height: '68px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1.5px solid rgba(255,255,255,0.1)',
                            color: swElapsed === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: swElapsed === 0 ? 'default' : 'pointer',
                            transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <RotateCcw size={22} />
                    </button>

                    {/* Start / Stop */}
                    {swRunning ? (
                        <button
                            onClick={handleSwStop}
                            aria-label="Stop"
                            style={{
                                width: '88px', height: '88px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(255,59,48,0.22) 0%, rgba(255,59,48,0.06) 100%)',
                                border: '2px solid rgba(255,59,48,0.55)',
                                color: '#ff3b30',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
                                boxShadow: '0 0 28px rgba(255,59,48,0.12)'
                            }}
                        >
                            <Square size={28} fill="#ff3b30" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSwStart}
                            aria-label="Start"
                            autoFocus
                            style={{
                                width: '88px', height: '88px', borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(187,134,252,0.28) 0%, rgba(187,134,252,0.07) 100%)',
                                border: '2px solid rgba(187,134,252,0.55)',
                                color: '#bb86fc',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
                                boxShadow: '0 0 28px rgba(187,134,252,0.18)'
                            }}
                        >
                            <Play size={30} fill="#bb86fc" style={{ marginLeft: '4px' }} />
                        </button>
                    )}

                    {/* Lap */}
                    <button
                        onClick={handleLap}
                        aria-label="Lap"
                        disabled={swElapsed === 0}
                        style={{
                            width: '68px', height: '68px', borderRadius: '50%',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1.5px solid rgba(255,255,255,0.1)',
                            color: swElapsed === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: swElapsed === 0 ? 'default' : 'pointer',
                            transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent'
                        }}
                    >
                        <Flag size={20} />
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // REST TIMER / COUNTDOWN / STANDBY
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
                borderRadius: '20px',
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
                        bottom: 0, left: 0, height: '3px',
                        background: 'var(--primary-color)',
                        width: `${progress}%`,
                        transition: 'width 1s linear'
                    }}
                />
            )}

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <TimerIcon size={16} color={is10s ? '#fff' : 'var(--primary-color)'} />
                        <span style={{
                            fontWeight: '600', fontSize: '0.8rem',
                            color: is10s ? '#fff' : 'var(--text-dim)',
                            textTransform: 'uppercase', letterSpacing: '1.5px'
                        }}>
                            {mode === 'standby' ? 'Timer' : mode === 'rest' ? 'Rest' : 'Countdown'}
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
                        <X size={18} />
                    </button>
                </div>

                {mode === 'standby' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                        {/* Stopwatch button */}
                        <button
                            className="button-primary"
                            onClick={startStopwatch}
                            style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px' }}
                        >
                            <Play size={18} /> Start Stopwatch
                        </button>

                        {/* Scroll wheel pickers */}
                        <div>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: '8px', marginBottom: '8px'
                            }}>
                                <ScrollPicker count={60} value={cdMinutes} onChange={setCdMinutes} label="min" />
                                <span style={{ fontSize: '2rem', fontWeight: '100', color: 'rgba(255,255,255,0.25)', paddingTop: '24px' }}>:</span>
                                <ScrollPicker count={60} value={cdSeconds} onChange={setCdSeconds} label="sec" />
                            </div>
                            <button
                                className="button-secondary"
                                disabled={cdMinutes === 0 && cdSeconds === 0}
                                onClick={() => startCountdown(cdMinutes * 60 + cdSeconds)}
                                style={{
                                    width: '100%', padding: '12px',
                                    borderRadius: '12px', fontWeight: '600',
                                    opacity: (cdMinutes === 0 && cdSeconds === 0) ? 0.4 : 1
                                }}
                            >
                                Start Countdown
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div
                            role="timer"
                            aria-live="polite"
                            style={{
                                fontSize: '3.2rem', fontWeight: '800',
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
                                fontSize: '0.85rem',
                                color: is10s ? 'rgba(255,255,255,0.8)' : 'var(--primary-color)',
                                marginTop: '8px', fontWeight: '500', fontStyle: 'italic'
                            }}>
                                "{motivation}"
                            </div>
                        )}
                        {mode === 'rest' && remaining <= 0 && (
                            <div style={{
                                fontSize: '1rem',
                                color: 'var(--primary-color)',
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
