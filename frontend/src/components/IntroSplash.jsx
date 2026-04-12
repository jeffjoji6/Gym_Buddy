import React, { useEffect, useState } from 'react';
import AppLogo from './AppLogo';

export default function IntroSplash({ onComplete }) {
    const [fade, setFade] = useState(false);

    useEffect(() => {
        // Start fade out after 2 seconds
        const timer = setTimeout(() => {
            setFade(true);
        }, 2000);

        // Remove component entirely after 2.5 seconds
        const removeTimer = setTimeout(() => {
            if (onComplete) onComplete();
        }, 2500);

        return () => {
            clearTimeout(timer);
            clearTimeout(removeTimer);
        };
    }, [onComplete]);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg-color)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            opacity: fade ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out',
        }}>
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <AppLogo size={140} style={{ 
                    marginBottom: '20px', 
                    border: '4px solid rgba(187,134,252,0.3)', 
                    padding: '8px',
                    boxShadow: '0 0 30px rgba(187,134,252,0.4)'
                }} />
                <h1 style={{ 
                    fontSize: '3rem', 
                    margin: 0, 
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #bb86fc, #03dac6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    Gym Buddy
                </h1>
                <div style={{
                    marginTop: '32px',
                    fontSize: '0.65rem',
                    color: 'rgba(255,255,255,0.25)',
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                    fontWeight: '400'
                }}>
                    powered by lighthouse labs
                </div>
            </div>
        </div>
    );
}
