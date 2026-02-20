import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import { UserProvider, useUser } from './context/UserContext';

const Home = lazy(() => import('./components/Home'));
const WorkoutView = lazy(() => import('./components/WorkoutView'));
const Dashboard = lazy(() => import('./components/Dashboard'));

// Authenticated Wrapper to check if user is logged in
function AuthenticatedRoutes() {
    const { user } = useUser();
    if (!user) return <Login />;

    return (
        <Layout>
            <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/workout/:type" element={<WorkoutView />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}

function App() {
    return (
        <UserProvider>
            <AuthenticatedRoutes />
        </UserProvider>
    );
}

export default App;
