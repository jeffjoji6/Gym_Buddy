import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NotificationContext = createContext();

const STORAGE_KEY = (user) => `gym_buddy_notifications_${user}`;

export function NotificationProvider({ children, user }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const stored = localStorage.getItem(STORAGE_KEY(user));
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed);
                setUnreadCount(parsed.filter(n => !n.read).length);
            } catch { /* ignore */ }
        }
    }, [user]);

    const save = (notifs) => {
        if (!user) return;
        // Keep only last 50
        const trimmed = notifs.slice(0, 50);
        localStorage.setItem(STORAGE_KEY(user), JSON.stringify(trimmed));
        setNotifications(trimmed);
        setUnreadCount(trimmed.filter(n => !n.read).length);
    };

    const addNotification = useCallback((type, title, message, icon = '🔔') => {
        if (!user) return;
        const notif = {
            id: Date.now(),
            type,
            title,
            message,
            icon,
            read: false,
            timestamp: new Date().toISOString()
        };
        const stored = localStorage.getItem(STORAGE_KEY(user));
        const current = stored ? JSON.parse(stored) : [];
        save([notif, ...current]);
    }, [user]);

    const markAllRead = useCallback(() => {
        const updated = notifications.map(n => ({ ...n, read: true }));
        save(updated);
    }, [notifications, user]);

    const clearAll = useCallback(() => {
        save([]);
    }, [user]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
