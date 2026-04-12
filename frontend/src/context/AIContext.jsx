import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { sendMessage as geminiSend, PERSONAS } from '../services/gemini';
import { getUserProfile } from '../services/api';
import { useUser } from './UserContext';

const AIContext = createContext(null);

const HYDRATION_MESSAGES = [
    "💧 Time to hydrate! Aim for a big sip of water right now between sets.",
    "💧 30 mins in — water check! Dehydration kills performance, keep sipping.",
    "💧 Mid-workout hydration reminder. A few sips now will carry you through.",
    "💧 Staying hydrated? Don't wait until you're thirsty — drink now!",
    "💧 Water break! Elite athletes hydrate on a schedule, not when thirsty.",
];

export function AIProvider({ children }) {
    const { user } = useUser();

    // Load saved persona from localStorage, default to 'garima'
    const getInitialPersona = () => {
        try {
            return localStorage.getItem(`gym_buddy_persona_${user}`) || 'garima';
        } catch {
            return 'garima';
        }
    };

    const [persona, setPersonaState] = useState(getInitialPersona);
    const [messages, setMessages] = useState([]); // { id, role: 'user'|'model'|'system', text, proactive? }
    const [isTyping, setIsTyping] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    const [userContext, setUserContext] = useState(null);
    const [workoutActive, setWorkoutActive] = useState(false);

    const hydrationTimer = useRef(null);
    const hydrationCount = useRef(0);
    const geminiHistory = useRef([]); // Raw Gemini history format

    const setPersona = useCallback((newPersona) => {
        setPersonaState(newPersona);
        localStorage.setItem(`gym_buddy_persona_${user}`, newPersona);
        // Reset conversation when persona switches
        setMessages([]);
        geminiHistory.current = [];
    }, [user]);

    // Load user profile unconditionally on mount/user change
    useEffect(() => {
        if (!user) return;
        const loadContext = async () => {
            try {
                const profile = await getUserProfile(user);
                setUserContext(prev => ({
                    ...prev,
                    userName: user,
                    goal: profile?.goal || null,
                    weight: profile?.weight_kg || null,
                    age: profile?.age || null,
                }));
            } catch (e) {
                console.error('Failed to load user profile for AI Context', e);
            }
        };
        loadContext();
    }, [user]);

    const buildContext = useCallback((profile, exercises, workoutType) => {
        const ctx = {
            userName: user || 'there',
            goal: profile?.goal || null,
            weight: profile?.weight_kg || null,
            age: profile?.age || null,
            todayWorkout: workoutType || null,
            exercises: exercises?.map(e => e.name) || [],
            topPRs: null,
        };
        setUserContext(ctx);
        return ctx;
    }, [user]);

    const addMessage = useCallback((role, text, proactive = false) => {
        const msg = { id: Date.now() + Math.random(), role, text, proactive, ts: new Date() };
        setMessages(prev => [...prev, msg]);
        if (role === 'model' || role === 'system') {
            setUnread(prev => prev + 1);
        }
        return msg;
    }, []);

    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;

        // Add user message to UI
        addMessage('user', text);

        // Add to Gemini history
        geminiHistory.current.push({ role: 'user', parts: [{ text }] });

        setIsTyping(true);
        try {
            const currentPersona = PERSONAS[persona] || PERSONAS.garima;
            const ctx = userContext || { userName: user || 'there' };
            const systemPrompt = currentPersona.buildSystemPrompt(ctx);
            
            let reply;
            // Easter egg check
            if (persona === 'garima' && text.toLowerCase().includes('bitch')) {
                reply = "such a bitch asss";
            } else if (persona === 'garima' && text.toLowerCase().trim() === 'fair') {
                reply = "enough";
            } else {
                // Send to Gemini (pass history MINUS the last user message, which we add inside sendMessage)
                const historyForRequest = geminiHistory.current.slice(0, -1);
                reply = await geminiSend(historyForRequest, text, systemPrompt);
            }

            // Add model reply to UI and history
            addMessage('model', reply);
            geminiHistory.current.push({ role: 'model', parts: [{ text: reply }] });
        } catch (err) {
            console.error('AI error:', err);
            let errMsg;
            if (err.message?.startsWith('rate_limit:')) {
                const secs = err.message.split(':')[1];
                errMsg = `⏳ I'm getting too many requests right now. Please wait ${secs} seconds and try again. (You may need to enable billing on your GCP project — see aistudio.google.com)`;
            } else if (err.message?.includes('VITE_GEMINI_API_KEY')) {
                errMsg = "⚙️ No API key found. Add VITE_GEMINI_API_KEY to your .env.local file to enable AI chat.";
            } else {
                errMsg = "Sorry, I couldn't reach the server. Check your connection and try again.";
            }
            addMessage('model', errMsg);
        } finally {
            setIsTyping(false);
        }
    }, [persona, userContext, user, addMessage]);

    // Called by WorkoutView when the first set is logged
    const workoutStarted = useCallback(async (workoutType, exercises, performanceCtx = null) => {
        if (workoutActive) return; // Don't trigger twice
        setWorkoutActive(true);
        setIsOpen(true);

        const currentPersona = PERSONAS[persona] || PERSONAS.garima;

        // Build smart coaching instruction based on performance data
        let greeting = `My user ${user || 'there'} just started their ${workoutType || 'workout'} session and logged their first set (${exercises?.[0]?.name || 'an exercise'}). Give them a short, punchy motivational workout start message. Stay in character.`;

        if (performanceCtx?.performanceNote) {
            if (performanceCtx.performanceStatus === 'STAGNANT') {
                greeting = `My user ${user || 'there'} just logged their first set of their ${workoutType || 'workout'} session. PERFORMANCE DATA: ${performanceCtx.performanceNote}. Based on this stagnancy, give a very specific, encouraging push — suggest the exact weight or reps increase. Stay in character. Be direct and motivating.`;
            } else if (performanceCtx.performanceStatus === 'PROGRESSING') {
                greeting = `My user ${user || 'there'} just started their ${workoutType || 'workout'} session. PERFORMANCE DATA: ${performanceCtx.performanceNote}. Celebrate this specific progress enthusiastically! Stay in character.`;
            }
        }

        setIsTyping(true);
        try {
            const ctx = { 
                ...(userContext || { userName: user || 'there' }), 
                todayWorkout: workoutType, 
                exercises: exercises?.map(e=>e.name),
                performanceStatus: performanceCtx?.performanceStatus || 'NEW',
            };
            setUserContext(ctx);
            const systemPrompt = currentPersona.buildSystemPrompt(ctx);
            const reply = await geminiSend([], greeting, systemPrompt);
            addMessage('model', reply, true);
        } catch {
            addMessage('model', `Workout started! Let's get to work, ${user || 'champ'}! 💪`, true);
        } finally {
            setIsTyping(false);
        }

        // Start hydration reminders every 20 minutes
        hydrationCount.current = 0;
        if (hydrationTimer.current) clearInterval(hydrationTimer.current);
        hydrationTimer.current = setInterval(() => {
            const msg = HYDRATION_MESSAGES[hydrationCount.current % HYDRATION_MESSAGES.length];
            addMessage('system', msg, true);
            hydrationCount.current++;
        }, 20 * 60 * 1000); // 20 minutes
    }, [workoutActive, persona, user, userContext, addMessage]);

    const stopWorkout = useCallback(() => {
        setWorkoutActive(false);
        if (hydrationTimer.current) {
            clearInterval(hydrationTimer.current);
            hydrationTimer.current = null;
        }
    }, []);

    const openChat = useCallback(() => {
        setIsOpen(true);
        setUnread(0);
    }, []);

    const closeChat = useCallback(() => setIsOpen(false), []);

    return (
        <AIContext.Provider value={{
            persona,
            setPersona,
            messages,
            isTyping,
            isOpen,
            unread,
            sendMessage,
            openChat,
            closeChat,
            workoutStarted,
            stopWorkout,
            buildContext,
            userContext,
            workoutActive,
        }}>
            {children}
        </AIContext.Provider>
    );
}

export const useAI = () => {
    const ctx = useContext(AIContext);
    if (!ctx) throw new Error('useAI must be used inside AIProvider');
    return ctx;
};
