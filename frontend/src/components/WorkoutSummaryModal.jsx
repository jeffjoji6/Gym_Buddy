import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { X, Share2, Download } from 'lucide-react';

export default function WorkoutSummaryModal({ exercises, type, date, split, onClose }) {
    const cardRef = useRef(null);
    const [exporting, setExporting] = useState(false);

    // Calculate facts
    let totalSets = 0;
    let totalVolume = 0;
    let prs = 0;
    
    exercises.forEach(ex => {
        const sets = ex.sets || [];
        totalSets += sets.length;
        sets.forEach(s => {
            totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
        });
        
        // PR calculation roughly
        const prevSets = ex.prev_week_sets || [];
        const prevMax = prevSets.length > 0 ? Math.max(...prevSets.map(s => parseFloat(s.weight) || 0)) : 0;
        const currentMax = sets.length > 0 ? Math.max(...sets.map(s => parseFloat(s.weight) || 0)) : 0;
        if (currentMax > prevMax && prevMax > 0) prs++;
    });

    const handleExport = async () => {
        if (!cardRef.current) return;
        setExporting(true);
        try {
            const canvas = await html2canvas(cardRef.current, { backgroundColor: '#121212', scale: 2 });
            const dataUrl = canvas.toDataURL('image/png');
            
            // Try native share API first
            if (navigator.share) {
                try {
                    const blob = await (await fetch(dataUrl)).blob();
                    const file = new File([blob], `workout_${date}_${type}.png`, { type: 'image/png' });
                    await navigator.share({
                        title: `${type} Workout Summary`,
                        files: [file]
                    });
                    setExporting(false);
                    return;
                } catch(e) {}
            }
            // Fallback download
            const link = document.createElement('a');
            link.download = `gymbuddy_${date}_${type}.png`;
            link.href = dataUrl;
            link.click();
        } catch(e) {
            console.error("Export failed", e);
        }
        setExporting(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
            <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()} style={{ padding: 0, overflow: 'hidden', background: 'transparent' }}>
                <div style={{ background: 'var(--surface-color)', borderRadius: '16px', overflow: 'hidden' }}>
                    
                    {/* Capture Area */}
                    <div ref={cardRef} style={{ background: 'linear-gradient(145deg, #1e1e1e, #121212)', padding: '32px 24px', color: '#fff', position: 'relative' }}>
                        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                            <div style={{ fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Workout Complete</div>
                            <h2 style={{ margin: '8px 0 0 0', fontSize: '2rem' }}>{type} Day</h2>
                            <div style={{ color: 'rgba(255,255,255,0.6)', marginTop: '4px', fontSize: '0.9rem' }}>
                                {(() => {
                                    const d = new Date(date);
                                    d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
                                    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                })()} • Split {split}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>{totalVolume.toLocaleString()}</div>
                                <div style={{ fontSize: '0.8rem', color: 'gray', textTransform: 'uppercase' }}>Volume (kg)</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success-color)' }}>{totalSets}</div>
                                <div style={{ fontSize: '0.8rem', color: 'gray', textTransform: 'uppercase' }}>Sets Logged</div>
                            </div>
                        </div>

                        {prs > 0 && (
                            <div style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', padding: '12px', borderRadius: '12px', textAlign: 'center', color: '#ffd700', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                🏆 {prs} Personal Record{prs > 1 ? 's' : ''}!
                            </div>
                        )}
                        
                        <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.75rem', color: 'gray', opacity: 0.5, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                            Logged with Gym Buddy
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ padding: '16px', display: 'flex', gap: '12px' }}>
                        <button className="button-secondary" onClick={onClose} style={{ flex: 1, padding: '12px' }}>Close</button>
                        <button className="button-primary" onClick={handleExport} disabled={exporting} style={{ flex: 2, padding: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {exporting ? 'Exporting...' : <><Share2 size={18} /> Share Result</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
