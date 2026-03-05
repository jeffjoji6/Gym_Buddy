import React, { createContext, useContext, useState, useEffect } from 'react';

const ActiveSessionContext = createContext();

const STORAGE_KEY = 'gym_buddy_active_session';

export function ActiveSessionProvider({ children }) {
    const [activeSession, setActiveSessionState] = useState(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });

    const setActiveSession = (session) => {
        setActiveSessionState(session);
        if (session) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const clearActiveSession = () => setActiveSession(null);

    return (
        <ActiveSessionContext.Provider value={{ activeSession, setActiveSession, clearActiveSession }}>
            {children}
        </ActiveSessionContext.Provider>
    );
}

export function useActiveSession() {
    return useContext(ActiveSessionContext);
}
