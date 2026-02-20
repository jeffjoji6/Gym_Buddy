import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/api';
import { useUser } from '../context/UserContext';
import { BarChart, Activity, Calendar, Clock, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';



const RecentActivity = ({ activities }) => {
    if (!activities || activities.length === 0) return (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '20px' }}>No recent activity</div>
    );

    return (
        <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={20} color="var(--success-color)" />
                History
            </h3>
            {activities.map((a, i) => (
                <div key={i} className="card" style={{ padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px' }}>
                            {new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{a.workout}</div>
                    </div>

                    {a.pr_count > 0 && (
                        <div style={{
                            background: 'var(--primary-color)',
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            maxWidth: '60%'
                        }}>
                            <Trophy size={14} />
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {a.pr_count === 1 && a.pr_details ? (
                                    <span>{a.pr_details}</span>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                                        <span>{a.pr_count} PRs</span>
                                        {a.pr_details && (
                                            <span style={{ fontSize: '0.65rem', opacity: 0.9, fontWeight: 'normal' }}>
                                                {a.pr_details}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default function Dashboard() {
    const { user } = useUser();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            try {
                const res = await getDashboardStats(user);
                if (res.success) {
                    setStats(res.data);
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        load();
    }, [user]);

    if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading Stats...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
            <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link to="/" style={{ color: 'var(--text-color)', display: 'flex', alignItems: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </Link>
                <h2 style={{ margin: 0 }}>Dashboard</h2>
            </div>

            {stats && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                {stats.workouts_this_week}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Workouts (This Week)</div>
                        </div>
                        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success-color)' }}>
                                {stats.prs_this_week}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>PRs (This Week)</div>
                        </div>
                    </div>

                    <RecentActivity activities={stats.recent_activity} />
                </>
            )}
        </div>
    );
}
