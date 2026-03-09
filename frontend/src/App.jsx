import React, { Suspense, lazy, useEffect } from 'react';
import { syncOfflineQueue } from './services/api';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import InstallPrompt from './components/InstallPrompt';
import { UserProvider, useUser } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
const Home = lazy(() => import('./components/Home'));
const WorkoutView = lazy(() => import('./components/WorkoutView'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const Profile = lazy(() => import('./components/Profile'));

// Authenticated Wrapper to check if user is logged in
function AuthenticatedRoutes() {
    const { user } = useUser();
    if (!user) return <Login />;

    return (
        <NotificationProvider user={user}>
            <Layout>
                <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/workout/:type" element={<WorkoutView />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </Suspense>
                <InstallPrompt />
            </Layout>
        </NotificationProvider>
    );
}

function App() {
    useEffect(() => {
        const handleOnline = () => syncOfflineQueue();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return (
        <UserProvider>
            <AuthenticatedRoutes />
        </UserProvider>
    );
}

export default App;
