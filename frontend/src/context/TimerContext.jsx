import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNotifications } from './NotificationContext';

const TimerContext = createContext();

export function TimerProvider({ children }) {
    const [mode, setMode] = useState('hidden'); // hidden, standby, rest, stopwatch, countdown
    const [duration, setDuration] = useState(0); // seconds
    const [elapsed, setElapsed] = useState(0);
    const { addNotification } = useNotifications();
    const intervalRef = useRef(null);
    const wakeLockRef = useRef(null);

    const motivationStrings = [
        "You got this!", "Push harder!", "Light weight baby!", "Breathe...", "Almost there!",
        "Stay hard!", "One more rep!", "Focus!", "Let's go!"
    ];

    const [motivation, setMotivation] = useState(motivationStrings[0]);

    useEffect(() => {
        if (mode !== 'hidden') {
            const getWakeLock = async () => {
                if ('wakeLock' in navigator) {
                    try {
                        wakeLockRef.current = await navigator.wakeLock.request('screen');
                    } catch (err) {}
                }
            };
            getWakeLock();
        } else {
            if (wakeLockRef.current) {
                wakeLockRef.current.release().then(() => wakeLockRef.current = null);
            }
        }
        return () => {
            if (wakeLockRef.current) {
                wakeLockRef.current.release().then(() => wakeLockRef.current = null);
            }
        }
    }, [mode]);

    useEffect(() => {
        if (mode === 'hidden' || mode === 'standby') return;

        intervalRef.current = setInterval(() => {
            setElapsed(prev => {
                const next = prev + 1;
                
                if (next > 0 && next % 30 === 0) {
                    setMotivation(motivationStrings[Math.floor(Math.random() * motivationStrings.length)]);
                }

                if (mode === 'rest' || mode === 'countdown') {
                    const remaining = duration - next;
                    if (remaining === 10) {
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    }
                    if (remaining <= 0) {
                        clearInterval(intervalRef.current);
                        if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);
                        addNotification('info', "Timer Finished!", "Time to get back to work!", "⏳");
                        setTimeout(() => closeTimer(), 3000);
                        return next;
                    }
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(intervalRef.current);
    }, [mode, duration, addNotification]);

    const startRestTimer = (secs = 90) => {
        setMode('rest');
        setDuration(secs);
        setElapsed(0);
        setMotivation(motivationStrings[0]);
    };

    const startStopwatch = () => {
        setMode('stopwatch');
        setDuration(0);
        setElapsed(0);
        setMotivation(motivationStrings[0]);
    };

    const startCountdown = (secs) => {
        setMode('countdown');
        setDuration(secs);
        setElapsed(0);
        setMotivation(motivationStrings[0]);
    };

    const closeTimer = () => {
        setMode('hidden');
        setElapsed(0);
        clearInterval(intervalRef.current);
    };
    
    const openTimerMenu = () => {
        setMode('standby');
    }

    return (
        <TimerContext.Provider value={{
            mode, duration, elapsed, motivation,
            startRestTimer, startStopwatch, startCountdown, closeTimer, openTimerMenu
        }}>
            {children}
        </TimerContext.Provider>
    );
}

export const useTimer = () => useContext(TimerContext);
