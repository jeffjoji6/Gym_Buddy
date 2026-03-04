import React, { useEffect, useState, useRef } from 'react';
import { getDashboardStats, getProgressData } from '../services/api';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { ChevronLeft, Flame, Dumbbell, Zap, Trophy, Clock, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const StatCard = ({ icon, value, label, color, sublabel }) => (
    <div style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '14px 10px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
    }}>
        <div style={{
            position: 'absolute', top: '-20px', right: '-20px',
            width: '80px', height: '80px', borderRadius: '50%',
            background: `${color}15`, filter: 'blur(20px)'
        }} />
        <div style={{ fontSize: '1.3rem', marginBottom: '2px' }}>{icon}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: '900', color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '3px', fontWeight: '500' }}>{label}</div>
        {sublabel && <div style={{ fontSize: '0.65rem', color, marginTop: '2px', opacity: 0.7 }}>{sublabel}</div>}
    </div>
);

const WeeklyHeatmap = ({ heatmap }) => {
    const today = new Date().getDay();
    const todayIdx = today === 0 ? 6 : today - 1;
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '16px', padding: '16px', marginBottom: '20px'
        }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-dim)' }}>This Week</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {dayLabels.map((day, i) => {
                    const count = heatmap[i];
                    const isToday = i === todayIdx;
                    return (
                        <div key={day} style={{ textAlign: 'center' }}>
                            <div style={{
                                fontSize: '0.7rem', color: isToday ? 'var(--primary-color)' : 'var(--text-dim)',
                                fontWeight: isToday ? '700' : '400', marginBottom: '6px'
                            }}>{day}</div>
                            <div style={{
                                width: '100%', aspectRatio: '1', borderRadius: '10px',
                                background: count > 0 ? `rgba(3, 218, 198, ${Math.min(0.15 + count * 0.25, 1)})` : 'rgba(255,255,255,0.04)',
                                border: isToday ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1rem', fontWeight: '700',
                                color: count > 0 ? 'var(--success-color)' : 'transparent'
                            }}>{count > 0 ? '✓' : ''}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// SVG Line Chart for progress
const ProgressChart = ({ data, exerciseName }) => {
    if (!data || data.length < 2) {
        return (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                {data?.length === 1 ? 'Need at least 2 weeks of data to show a graph' : 'No data for this exercise yet'}
            </div>
        );
    }

    const padding = { top: 20, right: 20, bottom: 35, left: 45 };
    const width = 320;
    const height = 180;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const weights = data.map(d => d.maxWeight);
    const minW = Math.min(...weights) * 0.9;
    const maxW = Math.max(...weights) * 1.1;
    const rangeW = maxW - minW || 1;

    const points = data.map((d, i) => ({
        x: padding.left + (i / (data.length - 1)) * chartW,
        y: padding.top + chartH - ((d.maxWeight - minW) / rangeW) * chartH,
        week: d.week,
        weight: d.maxWeight
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = linePath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    // Y-axis ticks
    const yTicks = 4;
    const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = minW + (rangeW * i) / yTicks;
        return { val: Math.round(val * 10) / 10, y: padding.top + chartH - (i / yTicks) * chartH };
    });

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {yLabels.map((yl, i) => (
                <g key={i}>
                    <line x1={padding.left} y1={yl.y} x2={width - padding.right} y2={yl.y}
                        stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <text x={padding.left - 8} y={yl.y + 4} textAnchor="end"
                        fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="system-ui">{yl.val}</text>
                </g>
            ))}

            {/* Area fill */}
            <path d={areaPath} fill="url(#lineGrad)" />

            {/* Line */}
            <path d={linePath} fill="none" stroke="var(--primary-color)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round" />

            {/* Data points + X labels */}
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-color)" stroke="var(--primary-color)" strokeWidth="2" />
                    <text x={p.x} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.4)"
                        fontSize="8" fontFamily="system-ui">W{p.week}</text>
                    {/* Weight label on last point */}
                    {i === points.length - 1 && (
                        <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--primary-color)"
                            fontSize="10" fontWeight="700" fontFamily="system-ui">{p.weight}kg</text>
                    )}
                </g>
            ))}

            {/* Y-axis label */}
            <text x="12" y={height / 2} textAnchor="middle" fill="rgba(255,255,255,0.3)"
                fontSize="8" fontFamily="system-ui" transform={`rotate(-90, 12, ${height / 2})`}>kg</text>
        </svg>
    );
};

const ActivityItem = ({ activity, index }) => {
    const workoutColors = { 'Push': '#ff6b6b', 'Pull': '#4ecdc4', 'Legs': '#ffe66d', 'Squat': '#ffe66d' };
    const accentColor = workoutColors[activity.workout] || 'var(--primary-color)';
    const date = new Date(activity.date);
    const timeAgo = getTimeAgo(date);
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
            background: 'rgba(255,255,255,0.03)', borderRadius: '12px', marginBottom: '8px',
            borderLeft: `3px solid ${accentColor}`, animation: `fadeIn 0.4s ease-out ${index * 0.05}s both`
        }}>
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: `${accentColor}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
                <Dumbbell size={18} color={accentColor} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{activity.workout}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{timeAgo}</div>
            </div>
            {activity.duration > 0 && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px',
                    borderRadius: '20px', background: 'rgba(255,255,255,0.06)', fontSize: '0.8rem',
                    color: 'var(--text-dim)', fontWeight: '500'
                }}>
                    <Clock size={12} />{activity.duration}m
                </div>
            )}
        </div>
    );
};

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
    const { user } = useUser();
    const { addNotification } = useNotifications();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [progressData, setProgressData] = useState(null);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const streakNotified = useRef(false);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            try {
                const [statsRes, progressRes] = await Promise.all([
                    getDashboardStats(user),
                    getProgressData(user)
                ]);
                if (statsRes.success) {
                    setStats(statsRes.data);
                    // Streak milestones notification
                    if (!streakNotified.current) {
                        const s = statsRes.data.streak;
                        const milestones = [3, 7, 14, 30, 50, 100];
                        const key = `streak_notif_${user}_${s}`;
                        if (milestones.includes(s) && !localStorage.getItem(key)) {
                            addNotification('streak', `🔥 ${s}-Day Streak!`, `You've worked out ${s} days in a row. Keep it going!`, '🔥');
                            localStorage.setItem(key, 'true');
                        }
                        streakNotified.current = true;
                    }
                }
                if (progressRes.success) {
                    setProgressData(progressRes.data);
                    if (progressRes.data.exerciseList.length > 0 && !selectedExercise) {
                        setSelectedExercise(progressRes.data.exerciseList[0].id);
                    }
                }
            } catch (e) { console.error(e); }
            setLoading(false);
        };
        load();
    }, [user]);

    const currentSeries = progressData?.progressSeries?.[selectedExercise] || [];
    const currentExName = progressData?.exerciseList?.find(e => e.id === selectedExercise)?.name || '';

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Dumbbell size={40} color="var(--primary-color)" style={{ animation: 'firePulse 1s ease-in-out infinite alternate' }} />
            <div style={{ marginTop: '12px', color: 'var(--text-dim)' }}>Loading your stats...</div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Link to="/" style={{ color: 'var(--text-color)', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={28} />
                </Link>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Hey, {user} 💪</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                        {stats?.streak > 0 ? `${stats.streak} day streak! Keep it up!` : 'Start your streak today!'}
                    </div>
                </div>
            </div>

            {stats && (
                <>
                    {/* Stat Cards - 2x2 grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        <StatCard
                            icon={<Dumbbell size={18} color="var(--primary-color)" />}
                            value={stats.workouts_this_week}
                            label="This Week"
                            color="var(--primary-color)"
                        />
                        <StatCard
                            icon={<Flame size={18} color="#ff6b6b" />}
                            value={stats.streak}
                            label="Day Streak"
                            color="#ff6b6b"
                        />
                        <StatCard
                            icon={<Zap size={18} color="var(--success-color)" />}
                            value={stats.total_volume_this_week >= 1000
                                ? `${(stats.total_volume_this_week / 1000).toFixed(1)}k`
                                : stats.total_volume_this_week
                            }
                            label="Volume (kg)"
                            color="var(--success-color)"
                        />
                        <StatCard
                            icon={<Trophy size={18} color="#ffd700" />}
                            value={stats.prs_this_week}
                            label="PRs This Week"
                            color="#ffd700"
                            sublabel={stats.prs_this_week > 0 ? stats.pr_details_list?.[0] : null}
                        />
                    </div>

                    {/* PR Details */}
                    {stats.prs_this_week > 0 && stats.pr_details_list?.length > 0 && (
                        <div style={{
                            background: 'rgba(255, 215, 0, 0.06)',
                            border: '1px solid rgba(255, 215, 0, 0.15)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#ffd700', marginBottom: '6px' }}>
                                🏆 PRs Hit This Week
                            </div>
                            {stats.pr_details_list.map((pr, i) => (
                                <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text-dim)', padding: '2px 0' }}>
                                    • {pr}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Weekly Heatmap */}
                    <WeeklyHeatmap heatmap={stats.weekly_heatmap} />

                    {/* Progress Graph */}
                    {progressData && progressData.exerciseList.length > 0 && (
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            borderRadius: '16px',
                            padding: '16px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)' }}>
                                    <TrendingUp size={16} color="var(--primary-color)" />
                                    Progress
                                </div>
                            </div>
                            <select
                                value={selectedExercise || ''}
                                onChange={e => setSelectedExercise(parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    background: 'var(--surface-highlight)',
                                    color: 'var(--text-color)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    marginBottom: '12px',
                                    outline: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {progressData.exerciseList.map(ex => (
                                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                                ))}
                            </select>
                            <ProgressChart data={currentSeries} exerciseName={currentExName} />
                        </div>
                    )}

                    {/* Recent Activity */}
                    <div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            marginBottom: '12px', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-dim)'
                        }}>
                            <Trophy size={16} color="var(--primary-color)" />
                            Recent Activity
                        </div>
                        {stats.recent_activity.length === 0 ? (
                            <div style={{
                                textAlign: 'center', color: 'var(--text-dim)', padding: '40px 20px',
                                background: 'rgba(255,255,255,0.03)', borderRadius: '16px'
                            }}>
                                No workouts yet. Go crush one! 🏋️
                            </div>
                        ) : (
                            stats.recent_activity.map((a, i) => (
                                <ActivityItem key={i} activity={a} index={i} />
                            ))
                        )}
                    </div>

                    {/* Total Sessions */}
                    <div style={{
                        textAlign: 'center', marginTop: '24px', padding: '12px', borderRadius: '12px',
                        background: 'rgba(187, 134, 252, 0.08)', border: '1px solid rgba(187, 134, 252, 0.15)',
                        fontSize: '0.85rem', color: 'var(--text-dim)'
                    }}>
                        🏆 {stats.total_sessions} total workouts completed
                    </div>
                </>
            )}
        </div>
    );
}
