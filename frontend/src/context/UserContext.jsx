import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState(localStorage.getItem('gym_buddy_user') || null);
    const [activeWeek, setActiveWeekState] = useState(
        localStorage.getItem('gym_buddy_week') ? parseInt(localStorage.getItem('gym_buddy_week')) : null
    );

    useEffect(() => {
        if (!user) return;
        // Only auto-fetch week if user hasn't explicitly set one in localStorage recently
        if (!localStorage.getItem('gym_buddy_week')) {
            import('../services/api').then(({ getDashboardStats }) => {
                getDashboardStats(user).then(res => {
                    if (res.success && res.data.calculated_active_week) {
                        setActiveWeekState(res.data.calculated_active_week);
                        // Don't save to localStorage yet, so if they clear it we re-calculate
                    } else {
                        setActiveWeekState(1); // fallback
                    }
                });
            });
        }
    }, [user]);

    // Expose a safe fallback for the UI while loading
    const displayWeek = activeWeek || 1;

    const login = (username) => {
        setUser(username);
        // On new login, clear old week so it recalculates based on their stats
        localStorage.removeItem('gym_buddy_week');
        setActiveWeekState(null);
        localStorage.setItem('gym_buddy_user', username);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('gym_buddy_user');
        localStorage.removeItem('gym_buddy_week');
        setActiveWeekState(null);
    };

    const setActiveWeek = (week) => {
        setActiveWeekState(week);
        localStorage.setItem('gym_buddy_week', week.toString());
    };

    return (
        <UserContext.Provider value={{ user, login, logout, activeWeek: displayWeek, setActiveWeek }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
