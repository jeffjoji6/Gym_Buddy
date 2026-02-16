import React from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Menu, User, LogOut, LayoutDashboard } from 'lucide-react';
import { useUser } from '../context/UserContext';

export default function Layout({ children }) {
    const { user, logout } = useUser();

    return (
        <div className="container">
            <header className="header">
                <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Dumbbell color="var(--primary-color)" />
                        <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Gym Buddy</span>
                    </div>
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', color: 'inherit' }} title="Dashboard">
                        <LayoutDashboard size={20} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{user}</span>
                    </div>
                    <LogOut size={20} title="Logout" onClick={logout} style={{ cursor: 'pointer' }} />
                </div>
            </header>
            <main>{children}</main>
        </div>
    );
}
