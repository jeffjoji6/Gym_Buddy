import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import WorkoutView from './components/WorkoutView';
import Layout from './components/Layout';
import Login from './components/Login';
import Admin from './components/Admin';
import { UserProvider, useUser } from './context/UserContext';

// Authenticated Wrapper to check if user is logged in
function AuthenticatedRoutes() {
    const { user } = useUser();
    if (!user) return <Login />;

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/workout/:type" element={<WorkoutView />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
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
