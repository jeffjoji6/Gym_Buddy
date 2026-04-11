import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
    const [user, setUser] = useState(localStorage.getItem('gym_buddy_user') || null);
    const toLocalDateString = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState(toLocalDateString(new Date()));

    useEffect(() => {
        if (!user) return;
        // Automatically default to today's date if not already set by session
        if (!selectedDate) {
            setSelectedDate(toLocalDateString(new Date()));
        }
    }, [user]);

    const login = (username) => {
        setUser(username);
        setSelectedDate(toLocalDateString(new Date()));
        localStorage.setItem('gym_buddy_user', username);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('gym_buddy_user');
        setSelectedDate(toLocalDateString(new Date()));
    };

    return (
        <UserContext.Provider value={{ user, login, logout, selectedDate, setSelectedDate }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
