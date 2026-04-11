import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Plus, X, Settings, Pencil } from 'lucide-react';
import { getUsers, deleteUser } from '../services/api';

// Gradient palettes per user avatar (cycles)
const AVATAR_GRADIENTS = [
    ['#bb86fc', '#7c4dff'],
    ['#03dac6', '#018786'],
    ['#ff6b6b', '#c94040'],
    ['#ffd700', '#f59e0b'],
    ['#64ffda', '#1de9b6'],
    ['#ff9f43', '#ee5a24'],
];

function UserAvatar({ name, size = 52, gradient }) {
    const initials = name
        .split(' ')
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    return (
        <div style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.38,
            fontWeight: '800',
            color: '#fff',
            flexShrink: 0,
            boxShadow: `0 4px 16px ${gradient[0]}55`,
            letterSpacing: '-1px',
        }}>
            {initials}
        </div>
    );
}

export default function Login() {
    const { login } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [manageMode, setManageMode] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [hoveredUser, setHoveredUser] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getUsers();
            const sortedUsers = (res.users || []).sort((a, b) => 
                a.username.localeCompare(b.username)
            );
            setUsers(sortedUsers);
        } catch (e) {
            console.error('Failed to fetch users', e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleLogin = (name) => {
        if (manageMode) return;
        login(name);
    };

    const handleCreate = (e) => {
        e.preventDefault();
        if (newName.trim()) login(newName.trim());
    };

    const handleDelete = async (e, username) => {
        e.stopPropagation();
        if (confirm(`Delete "${username}" and all their data? This cannot be undone.`)) {
            await deleteUser(username);
            fetchUsers();
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                <img src="/logo.png" alt="Gym Buddy" style={{ width: 60, height: 60, objectFit: 'contain', animation: 'firePulse 1s ease-in-out infinite alternate' }} />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Loading...</span>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-color)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background glow blobs */}
            <div style={{
                position: 'absolute', top: '-120px', left: '-80px',
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(187,134,252,0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '-100px', right: '-60px',
                width: '350px', height: '350px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(3,218,198,0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Settings gear — top right */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
                {manageMode ? (
                    <button
                        onClick={() => setManageMode(false)}
                        style={{
                            background: 'var(--primary-color)', color: '#000',
                            padding: '8px 16px', borderRadius: '20px',
                            fontSize: '0.85rem', fontWeight: '700',
                        }}
                    >
                        Done
                    </button>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-dim)',
                                width: '40px', height: '40px',
                                borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <Settings size={18} />
                        </button>
                        {showMenu && (
                            <div style={{
                                position: 'absolute', top: '48px', right: 0,
                                background: '#1e1e1e',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '12px', padding: '6px',
                                zIndex: 100, minWidth: '160px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            }}>
                                <button
                                    onClick={() => { setManageMode(true); setShowMenu(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        width: '100%', padding: '10px 14px',
                                        background: 'transparent', color: 'var(--text-color)',
                                        border: 'none', cursor: 'pointer', textAlign: 'left',
                                        fontSize: '0.9rem', borderRadius: '8px',
                                    }}
                                >
                                    <Pencil size={15} /> Manage Users
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Logo + Branding hero */}
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                paddingTop: '80px', paddingBottom: '40px',
                animation: 'slideUp 0.6s ease-out forwards',
            }}>
                <div style={{ position: 'relative', marginBottom: '24px' }}>
                    <div style={{
                        position: 'absolute', inset: '-12px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(187,134,252,0.25) 0%, transparent 70%)',
                    }} />
                    <img
                        src="/logo.png"
                        alt="Gym Buddy"
                        style={{
                            width: '90px', height: '90px',
                            objectFit: 'contain',
                            position: 'relative', zIndex: 1,
                            filter: 'drop-shadow(0 0 20px rgba(187,134,252,0.5))',
                        }}
                    />
                </div>

                <h1 style={{
                    margin: '0 0 8px',
                    fontSize: '2.4rem',
                    fontWeight: '900',
                    letterSpacing: '-1.5px',
                    background: 'linear-gradient(135deg, #fff 30%, rgba(187,134,252,0.85))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}>
                    Gym Buddy
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '1rem', margin: 0 }}>
                    Who is crushing it today?
                </p>
            </div>

            {/* Main content */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '0 20px 40px',
                animation: 'slideUp 0.7s ease-out forwards',
            }}>
                {!showAdd ? (
                    <div style={{ width: '100%', maxWidth: '480px' }}>

                        {/* User list — vertical cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                            {users.map((u, idx) => {
                                const gradient = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length];
                                const isHovered = hoveredUser === u.id;
                                return (
                                    <div
                                        key={u.id}
                                        onClick={() => handleLogin(u.username)}
                                        onMouseEnter={() => setHoveredUser(u.id)}
                                        onMouseLeave={() => setHoveredUser(null)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '16px',
                                            padding: '14px 16px',
                                            borderRadius: '16px',
                                            background: isHovered ? 'rgba(187,134,252,0.1)' : 'rgba(255,255,255,0.04)',
                                            border: `1px solid ${isHovered ? 'rgba(187,134,252,0.3)' : 'rgba(255,255,255,0.07)'}`,
                                            cursor: manageMode ? 'default' : 'pointer',
                                            transition: 'all 0.2s',
                                            position: 'relative',
                                            transform: isHovered && !manageMode ? 'translateX(4px)' : 'none',
                                            animation: manageMode ? 'wiggle 0.3s ease-in-out infinite' : 'none',
                                        }}
                                    >
                                        <UserAvatar name={u.username} gradient={gradient} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-color)' }}>
                                                {u.username}
                                            </div>
                                            {!manageMode && (
                                                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                    Tap to log in
                                                </div>
                                            )}
                                        </div>
                                        {/* Chevron or delete */}
                                        {manageMode ? (
                                            <button
                                                onClick={(e) => handleDelete(e, u.username)}
                                                style={{
                                                    background: 'rgba(207,102,121,0.15)',
                                                    border: '1px solid rgba(207,102,121,0.4)',
                                                    color: '#cf6679',
                                                    width: '32px', height: '32px',
                                                    borderRadius: '50%',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', flexShrink: 0,
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        ) : (
                                            <div style={{
                                                width: '8px', height: '8px',
                                                borderTop: '2px solid rgba(255,255,255,0.2)',
                                                borderRight: '2px solid rgba(255,255,255,0.2)',
                                                transform: 'rotate(45deg)',
                                                flexShrink: 0,
                                                transition: 'border-color 0.2s',
                                                borderColor: isHovered ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)',
                                            }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add new user button */}
                        {!manageMode && (
                            <button
                                onClick={() => setShowAdd(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    width: '100%', padding: '14px 16px',
                                    borderRadius: '16px',
                                    background: 'transparent',
                                    border: '1.5px dashed rgba(187,134,252,0.4)',
                                    color: 'var(--primary-color)',
                                    fontSize: '0.95rem', fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(187,134,252,0.07)'; e.currentTarget.style.borderColor = 'rgba(187,134,252,0.7)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(187,134,252,0.4)'; }}
                            >
                                <div style={{
                                    width: '26px', height: '26px', borderRadius: '50%',
                                    background: 'rgba(187,134,252,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Plus size={16} />
                                </div>
                                New User
                            </button>
                        )}
                    </div>
                ) : (
                    /* Create new user form */
                    <div style={{
                        width: '100%', maxWidth: '380px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '24px', padding: '28px 24px',
                        animation: 'slideUp 0.4s ease-out forwards',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>Create Profile</h3>
                            <button
                                onClick={() => setShowAdd(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.08)', border: 'none',
                                    color: 'var(--text-dim)', width: '32px', height: '32px',
                                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Alex"
                                    style={{
                                        width: '100%', padding: '14px 16px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '12px',
                                        color: '#fff', fontSize: '1rem',
                                        boxSizing: 'border-box',
                                        outline: 'none',
                                    }}
                                    autoFocus
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={!newName.trim()}
                                style={{
                                    width: '100%', padding: '15px',
                                    borderRadius: '14px',
                                    background: newName.trim()
                                        ? 'linear-gradient(135deg, #bb86fc, #7c4dff)'
                                        : 'rgba(255,255,255,0.08)',
                                    color: newName.trim() ? '#fff' : 'var(--text-dim)',
                                    fontWeight: '800', fontSize: '1rem',
                                    border: 'none', cursor: newName.trim() ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    letterSpacing: '0.5px',
                                    boxShadow: newName.trim() ? '0 4px 20px rgba(187,134,252,0.3)' : 'none',
                                }}
                            >
                                Start Your Journey 💪
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Bottom wordmark */}
            <div style={{ textAlign: 'center', paddingBottom: '24px', color: 'rgba(255,255,255,0.12)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
                Gym Buddy
            </div>
        </div>
    );
}
