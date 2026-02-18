import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Dumbbell, Plus, User, Trash2, X, Settings, ChevronDown, Shield, Pencil } from 'lucide-react';
import { getUsers, deleteUser } from '../services/api';

export default function Login() {
    const { login } = useUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');

    const navigate = useNavigate();
    const [manageMode, setManageMode] = useState(false);
    const [showManageMenu, setShowManageMenu] = useState(false);
    const manageMenuRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (manageMenuRef.current && !manageMenuRef.current.contains(e.target)) {
                setShowManageMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        {/* Manage Dropdown */}
                        <div ref={manageMenuRef} style={{ position: 'relative' }}>
                            <button
                                onClick={() => {
                                    if (manageMode) {
                                        setManageMode(false);
                                    } else {
                                        setShowManageMenu(!showManageMenu);
                                    }
                                }}
                                style={{
                                    background: manageMode ? 'var(--primary-color)' : 'transparent',
                                    color: manageMode ? '#000' : 'var(--text-dim)',
                                    padding: '8px 12px',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Settings size={16} />
                                {manageMode ? 'Done' : 'Manage'}
                                {!manageMode && <ChevronDown size={14} />}
                            </button>

                            {showManageMenu && !manageMode && (
                                <div style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '110%',
                                    background: 'var(--surface-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    zIndex: 100,
                                    minWidth: '150px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                                }}>
                                    <button
                                        onClick={() => { navigate('/admin'); setShowManageMenu(false); }}
                                        style={{
                                            width: '100%', padding: '12px 16px',
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            background: 'transparent', color: 'var(--text-color)',
                                            fontSize: '0.95rem', borderBottom: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <Shield size={16} color="var(--primary-color)" /> Admin
                                    </button>
                                    <button
                                        onClick={() => { setManageMode(true); setShowManageMenu(false); }}
                                        style={{
                                            width: '100%', padding: '12px 16px',
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            background: 'transparent', color: 'var(--text-color)',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        <Pencil size={16} color="var(--text-dim)" /> Edit
                                    </button>
                                </div>
                            )}
                        </div>
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
