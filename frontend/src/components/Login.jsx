import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Plus, User, X, Settings, Pencil } from 'lucide-react';
import { getUsers, deleteUser } from '../services/api';

export default function Login() {
    const { login } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');

    const navigate = useNavigate();
    const [manageMode, setManageMode] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await getUsers();
            setUsers(res.users || []);
        } catch (e) {
            console.error("Failed to fetch users", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleLogin = (name) => {
        if (manageMode) return; // Don't login in manage mode
        login(name);
    };

    const handleCreate = (e) => {
        e.preventDefault();
        if (newName.trim()) {
            login(newName.trim());
        }
    };

    const handleDelete = async (e, username) => {
        e.stopPropagation();
        if (confirm(`Delete user "${username}" and all their data? This cannot be undone.`)) {
            await deleteUser(username);
            fetchUsers();
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-dim)' }}>Loading users...</span>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            overflow: 'hidden'
        }} className="animate-fade-in">

            <div style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }} className="animate-slide-up">
                <Dumbbell size={64} color="var(--primary-color)" />
                <h1 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '2.5rem' }}>Gym Buddy</h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '1.1rem' }}>Who is crushing it today?</p>
            </div>

            {!showAdd ? (
                <div style={{ width: '100%', maxWidth: '500px' }} className="animate-slide-up">
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginBottom: '1rem' }}>
                        {manageMode ? (
                            <button
                                onClick={() => setManageMode(false)}
                                style={{
                                    background: 'var(--primary-color)',
                                    color: '#000',
                                    padding: '8px 14px',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    borderRadius: '8px'
                                }}
                            >
                                Done
                            </button>
                        ) : (
                            <>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        style={{
                                            background: 'transparent',
                                            color: 'var(--text-dim)',
                                            padding: '8px',
                                            display: 'flex', alignItems: 'center',
                                            cursor: 'pointer'
                                        }}
                                        title="Settings"
                                    >
                                        <Settings size={20} />
                                    </button>

                                    {showMenu && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: 0,
                                            marginTop: '5px',
                                            background: 'var(--card-bg, #1a1a1a)',
                                            border: '1px solid var(--border-color, #333)',
                                            borderRadius: '8px',
                                            padding: '5px',
                                            zIndex: 100,
                                            minWidth: '150px',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    navigate('/admin');
                                                    setShowMenu(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    background: 'transparent',
                                                    color: 'var(--text-main, #fff)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                <Settings size={16} /> Admin Panel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setManageMode(true);
                                                    setShowMenu(false);
                                                }}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    background: 'transparent',
                                                    color: 'var(--text-main, #fff)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                <Pencil size={16} /> Manage Users
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="user-grid">
                        {users.map(u => (
                            <div
                                key={u.id}
                                className={`user-chip ${manageMode ? 'animate-wiggle deleting' : ''}`}
                                onClick={() => handleLogin(u.username)}
                                style={{ cursor: manageMode ? 'default' : 'pointer' }}
                            >
                                {manageMode && (
                                    <div className="delete-btn" style={{ opacity: 1, background: 'red', width: '28px', height: '28px' }} onClick={(e) => handleDelete(e, u.username)}>
                                        <X size={16} />
                                    </div>
                                )}
                                <User size={32} style={{ marginBottom: '8px' }} />
                                <span style={{ fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                                    {u.username}
                                </span>
                            </div>
                        ))}

                        {!manageMode && (
                            <button
                                className="user-chip add-user-btn"
                                onClick={() => setShowAdd(true)}
                            >
                                <Plus size={32} style={{ marginBottom: '8px' }} />
                                <span>New User</span>
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <form onSubmit={handleCreate} style={{ width: '100%', maxWidth: '300px' }} className="animate-slide-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>Create Profile</h3>
                        <button type="button" onClick={() => setShowAdd(false)} style={{ background: 'transparent', padding: '4px' }}>
                            <X color="var(--text-dim)" />
                        </button>
                    </div>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter name"
                        style={{ width: '100%', marginBottom: '1rem', padding: '16px', boxSizing: 'border-box' }}
                        autoFocus
                    />
                    <button
                        className="button-primary"
                        style={{ width: '100%', padding: '16px' }}
                    >
                        Start Journey
                    </button>
                </form>
            )}
        </div>
    );
}
