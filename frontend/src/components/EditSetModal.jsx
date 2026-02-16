import React, { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import '../index.css'; // Ensure styles are available

export default function EditSetModal({ set, onSave, onDelete, onClose }) {
    const [weight, setWeight] = useState(set.weight);
    const [reps, setReps] = useState(set.reps);

    const adjustWeight = (amount) => {
        setWeight(prev => {
            const val = parseFloat(prev) || 0;
            return (val + amount).toFixed(1).replace(/\.0$/, '');
        });
    };

    const adjustReps = (amount) => {
        setReps(prev => {
            const val = parseInt(prev) || 0;
            return Math.max(0, val + amount);
        });
    };

    const handleSave = () => {
        onSave(set.id, parseFloat(weight), parseInt(reps));
    };

    const handleDelete = () => {
        // Standard confirm is okay for MVP
        if (confirm("Delete this set?")) {
            onDelete(set.id);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                background: 'var(--surface-color)',
                borderRadius: '16px',
                width: '85%',
                maxWidth: '400px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}>
                {/* Header - Fixed */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--surface-highlight)' }}>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '1rem', cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Set {set.set_number}</h3>
                    <button onClick={handleSave} style={{ background: 'var(--primary-color)', border: 'none', borderRadius: '20px', padding: '8px 20px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>
                        Save
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>Weight (kg)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="button-secondary" onClick={() => adjustWeight(-2.5)} style={{ width: '48px', fontSize: '1.5rem', padding: 0, flexShrink: 0 }}>−</button>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={weight}
                                onChange={e => setWeight(e.target.value)}
                                style={{ flex: 1, boxSizing: 'border-box', padding: '16px', fontSize: '1.2rem', textAlign: 'center', minWidth: 0 }}
                                autoFocus
                            />
                            <button className="button-secondary" onClick={() => adjustWeight(2.5)} style={{ width: '48px', fontSize: '1.5rem', padding: 0, flexShrink: 0 }}>+</button>
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-dim)', fontSize: '0.9rem' }}>Reps</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="button-secondary" onClick={() => adjustReps(-1)} style={{ width: '48px', fontSize: '1.5rem', padding: 0, flexShrink: 0 }}>−</button>
                            <input
                                type="number"
                                inputMode="numeric"
                                value={reps}
                                onChange={e => setReps(e.target.value)}
                                style={{ flex: 1, boxSizing: 'border-box', padding: '16px', fontSize: '1.2rem', textAlign: 'center', minWidth: 0 }}
                            />
                            <button className="button-secondary" onClick={() => adjustReps(1)} style={{ width: '48px', fontSize: '1.5rem', padding: 0, flexShrink: 0 }}>+</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
