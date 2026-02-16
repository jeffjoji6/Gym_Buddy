import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState(localStorage.getItem('gym_buddy_user') || null);
    const [activeWeek, setActiveWeekState] = useState(parseInt(localStorage.getItem('gym_buddy_week') || '1'));

    const login = (username) => {
        setUser(username);
        localStorage.setItem('gym_buddy_user', username);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('gym_buddy_user');
    };

    const setActiveWeek = (week) => {
        setActiveWeekState(week);
        localStorage.setItem('gym_buddy_week', week.toString());
    };

    return (
        <UserContext.Provider value={{ user, login, logout, activeWeek, setActiveWeek }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
