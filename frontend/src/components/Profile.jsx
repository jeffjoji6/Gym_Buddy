import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, User, Ruler, Weight, Heart, Save, Target } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getUserProfile, updateUserProfile } from '../services/api';

const bmiCategory = (bmi) => {
    if (bmi < 18.5) return { label: 'Underweight', color: '#4ecdc4', emoji: '🦴' };
    if (bmi < 25) return { label: 'Normal', color: '#03dac6', emoji: '💪' };
    if (bmi < 30) return { label: 'Overweight', color: '#ff8c00', emoji: '⚠️' };
    return { label: 'Obese', color: '#ff6b6b', emoji: '🔴' };
};

export default function Profile() {
    const { user } = useUser();
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [goal, setGoal] = useState('Maintain');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!user) return;
        const load = async () => {
            setLoading(true);
            const data = await getUserProfile(user);
            if (data) {
                setHeightCm(data.height_cm || '');
                setWeightKg(data.weight_kg || '');
                setAge(data.age || '');
                setGender(data.gender || '');
                if (data.goal) setGoal(data.goal);
            }
            setLoading(false);
        };
        load();
    }, [user]);

    const bmi = (heightCm && weightKg)
        ? (parseFloat(weightKg) / ((parseFloat(heightCm) / 100) ** 2)).toFixed(1)
        : null;

    const category = bmi ? bmiCategory(parseFloat(bmi)) : null;

    // BMI gauge position (15-40 range mapped to 0-100%)
    const gaugePercent = bmi ? Math.min(100, Math.max(0, ((parseFloat(bmi) - 15) / 25) * 100)) : 0;

    let tdee = null;
    let calorieTarget = null;
    if (heightCm && weightKg && age && gender) {
        const h = parseFloat(heightCm);
        const w = parseFloat(weightKg);
        const a = parseInt(age);
        if (h && w && a) {
            let bmr = (10 * w) + (6.25 * h) - (5 * a);
            if (gender === 'Male') bmr += 5;
            else bmr -= 161; 
            
            tdee = Math.round(bmr * 1.55); // moderate activity
            
            if (goal === 'Bulk') calorieTarget = tdee + 300;
            else if (goal === 'Cut') calorieTarget = tdee - 500;
            else calorieTarget = tdee;
        }
    }

    const handleSave = async () => {
        setSaving(true);
        await updateUserProfile(user, {
            height_cm: parseFloat(heightCm) || null,
            weight_kg: parseFloat(weightKg) || null,
            age: parseInt(age) || null,
            gender: gender || null,
            goal: goal || null
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>Loading profile...</div>;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div className="header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Link to="/" style={{ color: 'var(--text-color)', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={28} />
                </Link>
                <h2 style={{ margin: 0 }}>My Profile</h2>
            </div>

            {/* BMI Display Card */}
            {bmi && category && (
                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(187, 134, 252, 0.1), rgba(3, 218, 198, 0.05))',
                    border: '1px solid rgba(187, 134, 252, 0.2)',
                    padding: '24px',
                    textAlign: 'center',
                    marginBottom: '24px'
                }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginBottom: '8px' }}>Your BMI</div>
                    <div style={{
                        fontSize: '3.5rem',
                        fontWeight: '900',
                        color: category.color,
                        lineHeight: 1
                    }}>
                        {bmi}
                    </div>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '8px',
                        padding: '6px 16px',
                        borderRadius: '20px',
                        background: `${category.color}20`,
                        color: category.color,
                        fontWeight: '600',
                        fontSize: '0.95rem'
                    }}>
                        {category.emoji} {category.label}
                    </div>

                    {/* BMI Gauge Bar */}
                    <div style={{
                        marginTop: '20px',
                        position: 'relative',
                        height: '8px',
                        borderRadius: '4px',
                        background: 'linear-gradient(90deg, #4ecdc4, #03dac6, #ffd700, #ff8c00, #ff6b6b)',
                        overflow: 'visible'
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: '-4px',
                            left: `${gaugePercent}%`,
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: '#fff',
                            border: `3px solid ${category.color}`,
                            transform: 'translateX(-50%)',
                            boxShadow: `0 0 10px ${category.color}80`,
                            transition: 'left 0.5s ease-out'
                        }} />
                    </div>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        color: 'var(--text-dim)',
                        marginTop: '6px'
                    }}>
                        <span>15</span>
                        <span>18.5</span>
                        <span>25</span>
                        <span>30</span>
                        <span>40</span>
                    </div>
                </div>
            )}

            {/* Input Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Goal Selector */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Target size={18} color="var(--primary-color)" />
                        <label style={{ fontWeight: '600' }}>Fitness Goal</label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: tdee ? '16px' : '0' }}>
                        {['Bulk', 'Cut', 'Maintain'].map(g => (
                            <button
                                key={g}
                                onClick={() => setGoal(g)}
                                style={{
                                    flex: 1, padding: '10px', borderRadius: '10px',
                                    border: goal === g ? '2px solid var(--primary-color)' : '1px solid var(--surface-highlight)',
                                    background: goal === g ? 'rgba(187, 134, 252, 0.15)' : 'var(--surface-color)',
                                    color: goal === g ? 'var(--primary-color)' : 'var(--text-dim)',
                                    fontWeight: goal === g ? '700' : '400',
                                    cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s'
                                }}
                            >
                                {g}
                            </button>
                        ))}
                    </div>

                    {tdee && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginTop: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Maintenance TDEE:</span>
                                <span style={{ fontWeight: 'bold' }}>~{tdee} kcal</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 'bold' }}>Target for {goal}:</span>
                                <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>~{calorieTarget} kcal</span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Ruler size={18} color="var(--primary-color)" />
                        <label style={{ fontWeight: '600' }}>Height (cm)</label>
                    </div>
                    <input
                        type="number"
                        inputMode="numeric"
                        value={heightCm}
                        onChange={e => setHeightCm(e.target.value)}
                        placeholder="e.g. 175"
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '1.1rem' }}
                    />
                </div>

                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Weight size={18} color="var(--success-color)" />
                        <label style={{ fontWeight: '600' }}>Weight (kg)</label>
                    </div>
                    <input
                        type="number"
                        inputMode="decimal"
                        value={weightKg}
                        onChange={e => setWeightKg(e.target.value)}
                        placeholder="e.g. 70"
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '1.1rem' }}
                    />
                </div>

                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Heart size={18} color="var(--error-color)" />
                        <label style={{ fontWeight: '600' }}>Age</label>
                    </div>
                    <input
                        type="number"
                        inputMode="numeric"
                        value={age}
                        onChange={e => setAge(e.target.value)}
                        placeholder="e.g. 25"
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: '1.1rem' }}
                    />
                </div>

                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <User size={18} color="var(--text-dim)" />
                        <label style={{ fontWeight: '600' }}>Gender</label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['Male', 'Female', 'Other'].map(g => (
                            <button
                                key={g}
                                onClick={() => setGender(g)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '10px',
                                    border: gender === g ? '2px solid var(--primary-color)' : '1px solid var(--surface-highlight)',
                                    background: gender === g ? 'rgba(187, 134, 252, 0.15)' : 'var(--surface-color)',
                                    color: gender === g ? 'var(--primary-color)' : 'var(--text-dim)',
                                    fontWeight: gender === g ? '700' : '400',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <button
                className="button-primary"
                onClick={handleSave}
                disabled={saving}
                style={{
                    width: '100%',
                    marginTop: '24px',
                    padding: '16px',
                    fontSize: '1.1rem',
                    gap: '8px',
                    background: saved ? 'var(--success-color)' : 'var(--primary-color)'
                }}
            >
                {saving ? 'Saving...' : saved ? '✓ Saved!' : <><Save size={20} /> Save Profile</>}
            </button>
        </div>
    );
}
