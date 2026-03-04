import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, User, LogOut, LayoutDashboard, Bell, Menu, X, Home, TrendingUp } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';

function getTimeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
}

export default function Layout({ children }) {
    const { user, logout } = useUser();
    const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showNotifs, setShowNotifs] = useState(false);
    const notifRef = useRef(null);
    const location = useLocation();

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Close notif dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifs(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleBellClick = () => {
        setShowNotifs(!showNotifs);
        if (!showNotifs && unreadCount > 0) markAllRead();
    };

    const navItems = [
        { to: '/', icon: <Home size={20} />, label: 'Workouts' },
        { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
        { to: '/profile', icon: <User size={20} />, label: 'Profile' },
    ];

    return (
        <div className="container">
            {/* Header */}
            <header className="header">
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Dumbbell color="var(--primary-color)" size={22} />
                        <span style={{ fontSize: '1.15rem', fontWeight: '800', letterSpacing: '0.3px' }}>Gym Buddy</span>
                    </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Notification Bell */}
                    <div style={{ position: 'relative' }} ref={notifRef}>
                        <button
                            onClick={handleBellClick}
                            style={{
                                background: 'transparent', border: 'none', color: 'inherit',
                                cursor: 'pointer', padding: '4px', display: 'flex',
                                alignItems: 'center', position: 'relative'
                            }}
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span style={{
                                    position: 'absolute', top: '-2px', right: '-4px',
                                    background: '#ff6b6b', color: '#fff', fontSize: '0.55rem',
                                    fontWeight: '700', width: '15px', height: '15px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification dropdown */}
                        {showNotifs && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                                width: '280px', maxHeight: '360px', overflowY: 'auto',
                                background: 'var(--surface-color)', border: '1px solid var(--surface-highlight)',
                                borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                zIndex: 2000, animation: 'fadeIn 0.2s ease-out'
                            }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '12px 14px', borderBottom: '1px solid var(--surface-highlight)'
                                }}>
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>Notifications</span>
                                    {notifications.length > 0 && (
                                        <button onClick={clearAll} style={{
                                            background: 'transparent', border: 'none',
                                            color: 'var(--text-dim)', fontSize: '0.75rem', cursor: 'pointer'
                                        }}>Clear all</button>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                                        No notifications yet
                                    </div>
                                ) : (
                                    notifications.slice(0, 20).map(n => (
                                        <div key={n.id} style={{
                                            padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                            display: 'flex', gap: '10px', alignItems: 'flex-start',
                                            background: n.read ? 'transparent' : 'rgba(187, 134, 252, 0.05)'
                                        }}>
                                            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{n.icon}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: '600', fontSize: '0.82rem' }}>{n.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>{n.message}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '3px', opacity: 0.6 }}>
                                                    {getTimeAgo(n.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Hamburger */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        style={{
                            background: 'transparent', border: 'none', color: 'inherit',
                            cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
                        }}
                    >
                        <Menu size={22} />
                    </button>
                </div>
            </header>

            {/* Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.6)', zIndex: 5000, animation: 'blastFadeIn 0.2s ease-out'
                    }}
                />
            )}

            {/* Sidebar Panel */}
            <div style={{
                position: 'fixed', top: 0, right: sidebarOpen ? 0 : '-280px',
                width: '270px', height: '100vh', background: 'var(--surface-color)',
                borderLeft: '1px solid var(--surface-highlight)',
                zIndex: 5001, transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', flexDirection: 'column',
                boxShadow: sidebarOpen ? '-8px 0 30px rgba(0,0,0,0.4)' : 'none'
            }}>
                {/* Sidebar Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 20px', borderBottom: '1px solid var(--surface-highlight)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Dumbbell color="var(--primary-color)" size={20} />
                        <span style={{ fontWeight: '800', fontSize: '1rem' }}>Gym Buddy</span>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        style={{
                            background: 'transparent', border: 'none', color: 'var(--text-dim)',
                            cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* User Badge */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid var(--surface-highlight)',
                    display: 'flex', alignItems: 'center', gap: '12px'
                }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'rgba(187, 134, 252, 0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <User size={20} color="var(--primary-color)" />
                    </div>
                    <div>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{user}</div>
                    </div>
                </div>

                {/* Nav Items */}
                <div style={{ padding: '12px 10px', flex: 1 }}>
                    {navItems.map(item => {
                        const isActive = location.pathname === item.to;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 14px', borderRadius: '10px',
                                    textDecoration: 'none',
                                    color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
                                    background: isActive ? 'rgba(187, 134, 252, 0.1)' : 'transparent',
                                    fontWeight: isActive ? '600' : '400',
                                    fontSize: '0.95rem',
                                    marginBottom: '4px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {item.icon}
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Logout */}
                <div style={{ padding: '12px 10px', borderTop: '1px solid var(--surface-highlight)' }}>
                    <button
                        onClick={() => { setSidebarOpen(false); logout(); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '12px 14px', borderRadius: '10px',
                            width: '100%', textAlign: 'left',
                            background: 'transparent', border: 'none',
                            color: 'var(--error-color)', cursor: 'pointer',
                            fontSize: '0.95rem', fontWeight: '500'
                        }}
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </div>

            <main>{children}</main>
        </div>
    );
}
