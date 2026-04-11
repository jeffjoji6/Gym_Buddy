import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Mic, MicOff, Bot, Copy, Check } from 'lucide-react';
import { useAI } from '../context/AIContext';
import { PERSONAS } from '../services/gemini';

// ─── Sound Effects ─────────────────────────────────────────────────────────
const audioCtxRef = { current: null };
function getAudioCtx() {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtxRef.current;
}

function playSendSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) { /* fallback quiet */ }
}

function playReceiveSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
    } catch (e) { /* fallback quiet */ }
}

function playAlertSound() {
    try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(880, ctx.currentTime);
            osc2.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.15);
            osc2.connect(gain);
            osc2.start();
            osc2.stop(ctx.currentTime + 0.15);
        }, 100);
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) { /* fallback quiet */ }
}

function TypingDots() {
    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px 0' }}>
            {[0, 1, 2].map(i => (
                <div key={i} style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: 'var(--primary-color)',
                    animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
            ))}
        </div>
    );
}

function Message({ msg, personaAvatar }) {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (isUser || isSystem) return;
        navigator.clipboard.writeText(msg.text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isSystem) {
        return (
            <div style={{
                textAlign: 'center', margin: '16px 0',
                fontSize: '0.75rem', color: 'var(--text-dim)',
                textTransform: 'uppercase', letterSpacing: '1px',
                display: 'flex', justifyContent: 'center'
            }}>
                <span style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '4px 12px', borderRadius: '12px' 
                }}>
                    {msg.text}
                </span>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            marginBottom: '16px',
            alignItems: 'flex-end', gap: '8px'
        }} className="animate-slide-up">
            
            {/* Avatar for AI messages */}
            {!isUser && (
                <img 
                    src={personaAvatar} 
                    alt="AI" 
                    style={{ 
                        width: '28px', height: '28px', 
                        borderRadius: '50%', objectFit: 'cover',
                        flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)'
                    }} 
                />
            )}

            <div 
                onClick={handleCopy}
                style={{
                    maxWidth: '75%',
                    position: 'relative',
                    padding: '12px 16px',
                    // iMessage style tails
                    borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: isUser
                        ? 'linear-gradient(135deg, #bb86fc, #7c4dff)'
                        : 'rgba(255,255,255,0.09)',
                    color: '#fff',
                    fontSize: '0.95rem',
                    lineHeight: '1.45',
                    wordBreak: 'break-word',
                    boxShadow: isUser 
                        ? '0 4px 16px rgba(187,134,252,0.3)' 
                        : '0 2px 8px rgba(0,0,0,0.2)',
                    cursor: (!isUser && !isSystem) ? 'pointer' : 'default',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { if (!isUser) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => { if (!isUser) e.currentTarget.style.filter = 'brightness(1)'; }}
            >
                {msg.text}
                
                {copied && (
                    <div style={{
                        position: 'absolute', bottom: '-22px', right: '10px',
                        fontSize: '0.7rem', color: 'var(--success-color)',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        animation: 'chatSlideUp 0.2s ease-out'
                    }}>
                        <Check size={12} /> Copied
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AIAssistant() {
    const {
        persona, messages, isTyping, isOpen, unread,
        sendMessage, openChat, closeChat,
    } = useAI();

    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);

    const currentPersona = PERSONAS[persona] || PERSONAS.garima;

    // Auto-scroll to latest message
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isOpen]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        
        // Reset textarea height instantly
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }
        
        playSendSound();
        sendMessage(text);
    };

    // Play receive sound when a new message from 'model' or 'system' appears
    const previousMessagesLength = useRef(messages.length);
    useEffect(() => {
        if (messages.length > previousMessagesLength.current) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'model') {
                playReceiveSound();
            } else if (lastMsg.role === 'system') {
                playAlertSound();
            }
        }
        previousMessagesLength.current = messages.length;
    }, [messages]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const toggleVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Voice input is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onresult = (e) => {
            const transcript = e.results[0][0].transcript;
            setInput(prev => prev ? prev + ' ' + transcript : transcript);
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognition.start();
        setIsListening(true);
    };

    const hasApiKey = !!import.meta.env.VITE_GEMINI_API_KEY;

    return (
        <>
            {/* Inject typing dot animation */}
            <style>{`
                @keyframes typingDot {
                    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes chatSlideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes bubblePulse {
                    0%, 100% { box-shadow: 0 4px 20px rgba(187,134,252,0.4); }
                    50% { box-shadow: 0 4px 32px rgba(187,134,252,0.8); }
                }
            `}</style>

            {/* Floating Bubble */}
            {!isOpen && (
                <button
                    onClick={openChat}
                    aria-label={`Ask ${currentPersona.name}`}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '20px',
                        width: '58px',
                        height: '58px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #bb86fc, #7c4dff)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9000,
                        animation: unread > 0 ? 'bubblePulse 2s ease-in-out infinite' : 'none',
                        boxShadow: '0 4px 20px rgba(187,134,252,0.4)',
                        fontSize: '1.5rem',
                    }}
                >
                    <img 
                        src={currentPersona.avatar} 
                        alt={currentPersona.name} 
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                    />
                    <span style={{ display: 'none' }}>{currentPersona.emoji}</span>
                    {unread > 0 && (
                        <div style={{
                            position: 'absolute', top: '-2px', right: '-2px',
                            width: '18px', height: '18px', borderRadius: '50%',
                            background: '#ff6b6b', color: '#fff',
                            fontSize: '0.6rem', fontWeight: '800',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '2px solid var(--bg-color)',
                        }}>
                            {unread > 9 ? '9+' : unread}
                        </div>
                    )}
                </button>
            )}

            {/* Chat Panel */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={closeChat}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 9001,
                            backdropFilter: 'blur(4px)',
                        }}
                    />

                    {/* Panel */}
                    <div style={{
                        position: 'fixed',
                        bottom: 0, left: 0, right: 0,
                        height: '85vh',
                        maxHeight: '85vh',
                        background: '#141414',
                        borderRadius: '24px 24px 0 0',
                        zIndex: 9002,
                        display: 'flex',
                        flexDirection: 'column',
                        animation: 'chatSlideUp 0.35s cubic-bezier(0.22,1,0.36,1)',
                        overflow: 'hidden',
                        boxShadow: '0 -8px 60px rgba(0,0,0,0.8)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderBottom: 'none',
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(187,134,252,0.05)',
                            flexShrink: 0,
                        }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #bb86fc, #7c4dff)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.4rem',
                                boxShadow: '0 4px 12px rgba(187,134,252,0.4)',
                                flexShrink: 0,
                                overflow: 'hidden'
                            }}>
                                <img 
                                    src={currentPersona.avatar} 
                                    alt={currentPersona.name} 
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                />
                                <span style={{ display: 'none' }}>{currentPersona.emoji}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.3px' }}>
                                    {currentPersona.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                                    {currentPersona.tagline} · Your AI Trainer
                                </div>
                            </div>
                            <button
                                onClick={closeChat}
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    width: '34px', height: '34px',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* No API key warning */}
                        {!hasApiKey && (
                            <div style={{
                                background: 'rgba(255,180,0,0.1)',
                                border: '1px solid rgba(255,180,0,0.3)',
                                margin: '12px 16px 0',
                                padding: '10px 14px',
                                borderRadius: '10px',
                                fontSize: '0.8rem',
                                color: '#ffb300',
                            }}>
                                ⚙️ <strong>Setup Required:</strong> Add <code>VITE_GEMINI_API_KEY</code> to your <code>.env</code> file to enable AI chat. Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: '#ffb300' }}>aistudio.google.com</a>.
                            </div>
                        )}

                        {/* Messages */}
                        <div style={{
                            flex: 1, overflowY: 'auto',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}>
                            {messages.length === 0 && (
                                <div style={{
                                    flex: 1, display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center',
                                    gap: '12px', opacity: 0.4, textAlign: 'center',
                                    padding: '0 32px',
                                }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(187,134,252,0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                                        <img 
                                            src={currentPersona.avatar} 
                                            alt={currentPersona.name} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                        />
                                        <span style={{ fontSize: '3rem', display: 'none', lineHeight: '80px' }}>{currentPersona.emoji}</span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                                        Ask {currentPersona.name} anything
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                        Workout tips, nutrition advice, form cues — I'm here to help.
                                    </div>
                                </div>
                            )}

                            {messages.map(msg => (
                                <Message key={msg.id} msg={msg} personaAvatar={currentPersona.avatar} />
                            ))}

                            {isTyping && (
                                <div style={{ 
                                    display: 'flex', marginBottom: '16px', alignItems: 'flex-end', gap: '8px' 
                                }} className="animate-slide-up">
                                    <img 
                                        src={currentPersona.avatar} 
                                        alt="AI" 
                                        style={{ 
                                            width: '28px', height: '28px', 
                                            borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }} 
                                    />
                                    <div style={{
                                        padding: '12px 16px',
                                        borderRadius: '20px 20px 20px 4px',
                                        background: 'rgba(255,255,255,0.09)',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                                    }}>
                                        <TypingDots />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Bar */}
                        <div style={{
                            padding: '12px 16px',
                            paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
                            borderTop: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', gap: '8px', alignItems: 'flex-end',
                            background: '#141414',
                            flexShrink: 0,
                        }}>
                            {/* Mic button */}
                            <button
                                onClick={toggleVoice}
                                style={{
                                    width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                                    background: isListening
                                        ? 'rgba(255,107,107,0.2)'
                                        : 'rgba(255,255,255,0.06)',
                                    border: isListening
                                        ? '1px solid rgba(255,107,107,0.5)'
                                        : '1px solid rgba(255,255,255,0.1)',
                                    color: isListening ? '#ff6b6b' : 'var(--text-dim)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                    animation: isListening ? 'bubblePulse 1s ease-in-out infinite' : 'none',
                                }}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>

                            {/* Text input */}
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={`Ask ${currentPersona.name}…`}
                                rows={1}
                                style={{
                                    flex: 1,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '20px',
                                    padding: '10px 16px',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    resize: 'none',
                                    outline: 'none',
                                    lineHeight: '1.4',
                                    maxHeight: '100px',
                                    overflowY: 'auto',
                                    fontFamily: 'inherit',
                                }}
                                onInput={e => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                                }}
                            />

                            {/* Send button */}
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isTyping}
                                style={{
                                    width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                                    background: input.trim() && !isTyping
                                        ? 'linear-gradient(135deg, #bb86fc, #7c4dff)'
                                        : 'rgba(255,255,255,0.06)',
                                    border: 'none',
                                    color: input.trim() && !isTyping ? '#fff' : 'rgba(255,255,255,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: input.trim() && !isTyping ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    boxShadow: input.trim() && !isTyping ? '0 4px 12px rgba(187,134,252,0.3)' : 'none',
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
