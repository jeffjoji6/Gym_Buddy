import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Don't show if already dismissed
        if (localStorage.getItem('gym_buddy_install_dismissed')) return;

        // Don't show if already installed (standalone mode)
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;

        // Detect iOS Safari
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !window.MSStream;
        const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);

        if (isIOSDevice) {
            setIsIOS(true);
            // Show after a small delay so it doesn't flash on load
            setTimeout(() => setShowBanner(true), 2000);
            return;
        }

        // Chrome/Edge: listen for beforeinstallprompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setTimeout(() => setShowBanner(true), 2000);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowBanner(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('gym_buddy_install_dismissed', 'true');
    };

    if (!showBanner) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            right: '16px',
            background: 'linear-gradient(135deg, #1e1e2e, #2a2a3e)',
            border: '1px solid rgba(187, 134, 252, 0.3)',
            borderRadius: '16px',
            padding: '16px',
            zIndex: 9000,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            animation: 'slideUp 0.5s ease-out'
        }}>
            <button
                onClick={handleDismiss}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    padding: '4px'
                }}
            >
                <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0
                }}>
                    💪
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', marginBottom: '2px' }}>
                        Install Gym Buddy
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                        {isIOS
                            ? 'Tap the Share button, then "Add to Home Screen"'
                            : 'Add to your home screen for quick access'
                        }
                    </div>
                </div>
            </div>

            {isIOS ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    marginTop: '12px',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--text-dim)'
                }}>
                    <Share size={16} /> Tap Share → Add to Home Screen
                </div>
            ) : (
                <button
                    onClick={handleInstall}
                    style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '12px',
                        background: 'var(--primary-color)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <Download size={18} />
                    Install App
                </button>
            )}
        </div>
    );
}
