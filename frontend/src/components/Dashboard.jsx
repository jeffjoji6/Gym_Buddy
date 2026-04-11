import React, { useEffect, useState, useRef } from 'react';
import { getDashboardStats, getProgressData } from '../services/api';
import { useUser } from '../context/UserContext';
import { useNotifications } from '../context/NotificationContext';
import { ChevronLeft, Flame, Zap, Trophy, Clock, TrendingUp, Share2 } from 'lucide-react';
import AppLogo from './AppLogo';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';

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
                    const count = heatmap ? heatmap[i] : 0;
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
const ProgressChart = ({ data, exerciseName, rawDots }) => {
    if (!data || data.length < 1) {
        return (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                No data for this exercise yet
            </div>
        );
    }

    const padding = { top: 24, right: 20, bottom: 40, left: 45 };
    const width = 320;
    const height = 200;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    // Use rawDots for last 45 days if available, else fall back to trend line data
    const allWeights = [
        ...data.map(d => d.maxWeight),
        ...(rawDots || []).map(d => d.weight)
    ];
    const minW = allWeights.length ? Math.min(...allWeights) * 0.88 : 0;
    const maxW = allWeights.length ? Math.max(...allWeights) * 1.08 : 100;
    const rangeW = maxW - minW || 1;

    // Date range: use last 45 days from today as the x-axis
    const now = new Date();
    const cutoffMs = now.getTime() - 45 * 24 * 60 * 60 * 1000;
    
    // Get full date extent from all data points
    const allDates = [
        ...data.map(d => new Date(d.week).getTime()),
        ...(rawDots || []).map(d => new Date(d.date).getTime())
    ].filter(t => !isNaN(t));
    const minDate = allDates.length ? Math.min(...allDates, cutoffMs) : cutoffMs;
    const maxDate = now.getTime();
    const rangeDate = maxDate - minDate || 1;

    const toX = (dateStr) => padding.left + ((new Date(dateStr).getTime() - minDate) / rangeDate) * chartW;
    const toY = (w) => padding.top + chartH - ((w - minW) / rangeW) * chartH;

    // Trend line points (max weight per session - all time)
    const points = data
        .filter(d => new Date(d.week).getTime() >= minDate)
        .map(d => ({ x: toX(d.week), y: toY(d.maxWeight), week: d.week, weight: d.maxWeight }));

    const linePath = points.length > 1 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : null;
    const areaPath = linePath ? linePath + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z` : null;

    // Y-axis labels with 2.5kg increments
    const step = 2.5;
    const tickMin = Math.floor(minW / step) * step;
    const tickMax = Math.ceil(maxW / step) * step;
    
    const yLabels = [];
    for (let val = tickMin; val <= tickMax; val += step) {
        yLabels.push({
            val: val % 1 === 0 ? val : val.toFixed(1),
            y: padding.top + chartH - ((val - minW) / rangeW) * chartH
        });
    }

    // X-axis ticks: ~6 ticks spread across the date range
    const xTickCount = 5;
    const xLabels = Array.from({ length: xTickCount + 1 }, (_, i) => {
        const t = minDate + (rangeDate * i) / xTickCount;
        const d = new Date(t);
        return {
            label: `${d.getMonth() + 1}/${d.getDate()}`,
            x: padding.left + (i / xTickCount) * chartW
        };
    });

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Grid lines */}
            {yLabels.map((yl, i) => (
                <g key={i}>
                    <line x1={padding.left} y1={yl.y} x2={width - padding.right} y2={yl.y}
                        stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                    <text x={padding.left - 6} y={yl.y + 4} textAnchor="end"
                        fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="system-ui">{yl.val}</text>
                </g>
            ))}

            {/* X-axis labels */}
            {xLabels.map((xl, i) => (
                <text key={i} x={xl.x} y={height - 4} textAnchor="middle"
                    fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="system-ui">{xl.label}</text>
            ))}

            {/* Area fill */}
            {areaPath && <path d={areaPath} fill="url(#lineGrad)" />}

            {/* Trend line */}
            {linePath && (
                <path d={linePath} fill="none" stroke="var(--primary-color)" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            )}

            {/* Raw scatter dots — every set in last 45 days */}
            {(rawDots || []).map((dot, i) => {
                const x = toX(dot.date);
                const y = toY(dot.weight);
                if (isNaN(x) || isNaN(y)) return null;
                return (
                    <circle key={`dot-${i}`} cx={x} cy={y} r="3"
                        fill="rgba(187,134,252,0.35)" stroke="rgba(187,134,252,0.7)" strokeWidth="1" />
                );
            })}

            {/* Trend line data points (max per day) */}
            {points.map((p, i) => (
                <g key={i}>
                    <circle cx={p.x} cy={p.y} r="4.5" fill="var(--bg-color)" stroke="var(--primary-color)" strokeWidth="2" />
                    {i === points.length - 1 && (
                        <text x={p.x} y={p.y - 10} textAnchor="middle" fill="var(--primary-color)"
                            fontSize="10" fontWeight="700" fontFamily="system-ui">{p.weight}kg</text>
                    )}
                </g>
            ))}

            {/* Y-axis label */}
            <text x="10" y={height / 2} textAnchor="middle" fill="rgba(255,255,255,0.3)"
                fontSize="8" fontFamily="system-ui" transform={`rotate(-90, 10, ${height / 2})`}>kg</text>
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
                <AppLogo size={18} />
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
    const [weekOffset, setWeekOffset] = useState(0); // 0 = this, 1 = last
    const [progressData, setProgressData] = useState(null);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const streakNotified = useRef(false);
    const dashboardRef = useRef(null);
    const shareCardRef = useRef(null);
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        if (!shareCardRef.current) return;
        setExporting(true);
        try {
            // Temporarily show the hidden card for capturing
            const card = shareCardRef.current;
            card.style.display = 'block';
            card.style.position = 'fixed';
            card.style.left = '-9999px';
            
            const canvas = await html2canvas(card, { 
                backgroundColor: '#121212', 
                scale: 3,
                useCORS: true,
                allowTaint: true
            });
            
            card.style.display = 'none';
            
            const dataUrl = canvas.toDataURL('image/png');
            
            if (navigator.share) {
                try {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], `weekly_progress_${user}.png`, { type: 'image/png' });
                    await navigator.share({
                        title: `Weekly Progress`,
                        files: [file]
                    });
                    setExporting(false);
                    return;
                } catch(e) {}
            }
            
            const link = document.createElement('a');
            link.download = `gymbuddy_progress.png`;
            link.href = dataUrl;
            link.click();
        } catch(e) {
            console.error("Export failed", e);
        }
        setExporting(false);
    };

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            try {
                const [statsRes, progressRes] = await Promise.all([
                    getDashboardStats(user, weekOffset),
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
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        load();
    }, [user, weekOffset]);

    const currentSeries = progressData?.progressSeries?.[selectedExercise] || [];
    const currentExName = progressData?.exerciseList?.find(e => e.id === selectedExercise)?.name || '';
    const currentRawDots = progressData?.rawDotsMap?.[selectedExercise] || [];

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <AppLogo size={40} style={{ animation: 'firePulse 1s ease-in-out infinite alternate' }} />
            <div style={{ marginTop: '12px', color: 'var(--text-dim)' }}>Loading your stats...</div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div ref={dashboardRef} style={{ background: 'var(--bg-color)', padding: '16px' }}>
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

            {/* Week Selector */}
            <div style={{ 
                display: 'flex', 
                background: 'rgba(255,255,255,0.04)', 
                borderRadius: '12px', 
                padding: '4px', 
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.06)'
            }}>
                <button 
                    onClick={() => setWeekOffset(0)}
                    style={{ 
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        background: weekOffset === 0 ? 'var(--primary-color)' : 'transparent',
                        color: weekOffset === 0 ? '#000' : 'var(--text-dim)',
                        transition: '0.2s'
                    }}
                >
                    This Week
                </button>
                <button 
                    onClick={() => setWeekOffset(1)}
                    style={{ 
                        flex: 1, 
                        padding: '10px', 
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        background: weekOffset === 1 ? 'var(--primary-color)' : 'transparent',
                        color: weekOffset === 1 ? '#000' : 'var(--text-dim)',
                        transition: '0.2s'
                    }}
                >
                    Last Week
                </button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: '600' }}>
                {stats?.week_label}
            </div>

            {stats && (
                <>
                    {/* Stat Cards - 2x2 grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        <StatCard
                            icon={<AppLogo size={18} />}
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
                    {progressData && progressData.exerciseList && progressData.exerciseList.length > 0 && (
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
                            <ProgressChart data={currentSeries} exerciseName={currentExName} rawDots={currentRawDots} />
                            {/* Legend */}
                            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.72rem', color: 'var(--text-dim)', justifyContent: 'center' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '10px', height: '2px', background: 'var(--primary-color)', display: 'inline-block', borderRadius: '2px' }}></span>
                                    Max per session
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(187,134,252,0.5)', border: '1px solid rgba(187,134,252,0.8)', display: 'inline-block' }}></span>
                                    All sets (last 45 days)
                                </span>
                            </div>
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
                        {stats.recent_activity && stats.recent_activity.length === 0 ? (
                            <div style={{
                                textAlign: 'center', color: 'var(--text-dim)', padding: '40px 20px',
                                background: 'rgba(255,255,255,0.03)', borderRadius: '16px'
                            }}>
                                No workouts yet. Go crush one! 🏋️
                            </div>
                        ) : (
                            (stats.recent_activity || []).map((a, i) => (
                                <ActivityItem key={i} activity={a} index={i} />
                            ))
                        )}
                    </div>

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
            
            <button 
                className="button-primary" 
                onClick={handleExport} 
                disabled={exporting}
                style={{ width: '100%', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px' }}
            >
                <Share2 size={18} /> {exporting ? 'Creating Image...' : 'Export Progress Card'}
            </button>

            {/* Redesigned Hidden Export Card */}
            <div ref={shareCardRef} style={{ 
                display: 'none', 
                width: '400px', 
                padding: '40px',
                background: 'linear-gradient(135deg, #121212 0%, #1a1a2e 100%)',
                color: '#fff',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <AppLogo size={80} style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(187, 134, 252, 0.4))' }} />
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-1px' }}>GYM BUDDY</h1>
                    <p style={{ margin: '8px 0 0', color: 'var(--primary-color)', fontSize: '1rem', fontWeight: '600', opacity: 0.8 }}>Weekly Progress Summary</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--primary-color)', fontSize: '2.5rem', fontWeight: '900' }}>{stats?.workouts_this_week}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Workouts</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                        <div style={{ color: 'var(--success-color)', fontSize: '2.5rem', fontWeight: '900' }}>
                           {stats?.total_volume_this_week >= 1000 ? `${(stats.total_volume_this_week / 1000).toFixed(1)}k` : stats?.total_volume_this_week}
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '1px' }}>Volume (kg)</div>
                    </div>
                </div>

                {stats?.pr_details_list?.length > 0 && (
                <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
                    <div style={{ fontSize: '0.9rem', color: '#ffd700', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🏆 TOP PERFORMANCE
                    </div>
                    {stats.pr_details_list.slice(0, 3).map((pr, i) => (
                        <div key={i} style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>{pr}</div>
                    ))}
                </div>
                )}

                <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                        Hey, {user} crushed it this week!
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(187, 134, 252, 0.6)', marginTop: '4px' }}>
                        {stats?.week_label}
                    </div>
                </div>
            </div>
        </div>
    );
}
