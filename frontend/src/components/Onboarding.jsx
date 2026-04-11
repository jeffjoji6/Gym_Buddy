import React, { useState } from 'react';
import { updateUserProfile } from '../services/api';
import { useUser } from '../context/UserContext';
import { ChevronRight, Ruler, Weight, User as UserIcon, Activity } from 'lucide-react';

export default function Onboarding({ onComplete }) {
    const { user } = useUser();
    const [step, setStep] = useState(1);
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [heightCm, setHeightCm] = useState('');
    const [weightKg, setWeightKg] = useState('');
    const [goal, setGoal] = useState('');
    const [loading, setLoading] = useState(false);

    const handleNext = async () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            setLoading(true);
            await updateUserProfile(user, {
                age: parseInt(age) || null,
                gender: gender || null,
                height_cm: parseFloat(heightCm) || null,
                weight_kg: parseFloat(weightKg) || null,
                goal: goal || null
            });
            setLoading(false);
            onComplete();
        }
    };

    const isStepValid = () => {
        if (step === 1) return age && gender;
        if (step === 2) return heightCm && weightKg;
        if (step === 3) return goal;
        return false;
    };

    return (
        <div style={{ padding: '40px 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ marginBottom: '10px', textAlign: 'center', color: 'var(--primary-color)' }}>Welcome to Gym Buddy!</h1>
            <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginBottom: '40px' }}>Let's set up your profile to personalize your experience.</p>

            <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '24px' }}>
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Step 1: Basics</h3>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
                                <UserIcon size={18} /> Age
                            </label>
                            <input 
                                type="number" 
                                value={age} 
                                onChange={e => setAge(e.target.value)} 
                                placeholder="e.g. 25"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
                                <UserIcon size={18} /> Gender
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['Male', 'Female', 'Other'].map(g => (
                                    <button 
                                        key={g}
                                        onClick={() => setGender(g)}
                                        style={{ 
                                            flex: 1, padding: '10px', borderRadius: '8px',
                                            border: gender === g ? '2px solid var(--primary-color)' : '1px solid var(--surface-highlight)',
                                            background: gender === g ? 'rgba(187,134,252,0.1)' : 'transparent',
                                            color: gender === g ? 'var(--primary-color)' : 'var(--text-dim)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Step 2: Measurements</h3>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
                                <Ruler size={18} /> Height (cm)
                            </label>
                            <input 
                                type="number" 
                                value={heightCm} 
                                onChange={e => setHeightCm(e.target.value)} 
                                placeholder="e.g. 175"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '600' }}>
                                <Weight size={18} /> Weight (kg)
                            </label>
                            <input 
                                type="number" 
                                value={weightKg} 
                                onChange={e => setWeightKg(e.target.value)} 
                                placeholder="e.g. 75"
                                style={{ width: '100%', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-fade-in">
                        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Step 3: Your Goal</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[
                                { id: 'Bulk', desc: 'Build muscle & gain weight' },
                                { id: 'Cut', desc: 'Lose fat & maintain muscle' },
                                { id: 'Maintain', desc: 'Stay at current weight' }
                            ].map(g => (
                                <button 
                                    key={g.id}
                                    onClick={() => setGoal(g.id)}
                                    style={{ 
                                        padding: '16px', borderRadius: '12px', textAlign: 'left',
                                        border: goal === g.id ? '2px solid var(--primary-color)' : '1px solid var(--surface-highlight)',
                                        background: goal === g.id ? 'rgba(187,134,252,0.1)' : 'transparent',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: goal === g.id ? 'var(--primary-color)' : 'var(--text-color)' }}>
                                        {g.id}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                        {g.desc}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[1, 2, 3].map(i => (
                            <div key={i} style={{ 
                                width: '10px', height: '10px', borderRadius: '50%', 
                                background: step === i ? 'var(--primary-color)' : step > i ? 'var(--success-color)' : 'var(--surface-highlight)' 
                            }} />
                        ))}
                    </div>
                    <button 
                        className="button-primary" 
                        onClick={handleNext}
                        disabled={!isStepValid() || loading}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {loading ? 'Saving...' : step === 3 ? 'Finish' : 'Next'} <ChevronRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
