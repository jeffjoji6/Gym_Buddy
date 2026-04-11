import React, { Suspense, lazy, useEffect } from 'react';
import { syncOfflineQueue } from './services/api';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import InstallPrompt from './components/InstallPrompt';
import { UserProvider, useUser } from './context/UserContext';
import { NotificationProvider } from './context/NotificationContext';
import { TimerProvider } from './context/TimerContext';
import GlobalTimer from './components/GlobalTimer';
import IntroSplash from './components/IntroSplash';
const lazyWithRetry = (componentImport) =>
    lazy(async () => {
        const pageHasAlreadyBeenForceRefreshed = JSON.parse(
            window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
        );

        try {
            const component = await componentImport();
            window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
            return component;
        } catch (error) {
            if (!pageHasAlreadyBeenForceRefreshed) {
                // Manual check for chunk load errors or fetch errors
                window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
                return window.location.reload();
            }
            throw error;
        }
    });

const Home = lazyWithRetry(() => import('./components/Home'));
const WorkoutView = lazyWithRetry(() => import('./components/WorkoutView'));
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const Profile = lazyWithRetry(() => import('./components/Profile'));
const Onboarding = lazyWithRetry(() => import('./components/Onboarding'));

// Authenticated Wrapper to check if user is logged in
function AuthenticatedRoutes() {
    const { user } = useUser();
    const [profileComplete, setProfileComplete] = React.useState(null);

    React.useEffect(() => {
        if (!user) return;
        import('./services/api').then(({ getUserProfile }) => {
            getUserProfile(user).then(data => {
                if (data && data.height_cm && data.weight_kg && data.goal) {
                    setProfileComplete(true);
                } else {
                    setProfileComplete(false);
                }
            });
        });
    }, [user]);

    if (!user) return <Login />;
    if (profileComplete === null) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading profile...</div>;

    if (!profileComplete) {
        return (
            <NotificationProvider user={user}>
                <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>}>
                    <Routes>
                        <Route path="*" element={<Onboarding onComplete={() => setProfileComplete(true)} />} />
                    </Routes>
                </Suspense>
                <InstallPrompt />
            </NotificationProvider>
        );
    }

    return (
        <NotificationProvider user={user}>
            <TimerProvider>
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
                <GlobalTimer />
            </Layout>
            </TimerProvider>
        </NotificationProvider>
    );
}

function App() {
    const [showSplash, setShowSplash] = React.useState(true);

    useEffect(() => {
        const handleOnline = () => syncOfflineQueue();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return (
        <UserProvider>
            {showSplash && <IntroSplash onComplete={() => setShowSplash(false)} />}
            {!showSplash && <AuthenticatedRoutes />}
        </UserProvider>
    );
}

export default App;
