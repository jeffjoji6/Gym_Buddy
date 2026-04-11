// Gemini Flash Latest via REST API — most stable for quotas
const API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

export const PERSONAS = {
    garima: {
        name: 'Garima',
        emoji: '🔥',
        avatar: '/garima.png',
        tagline: 'High-energy & motivational',
        buildSystemPrompt: (ctx) =>
            `You are Garima, a playful, high-energy, and intensely motivational personal trainer inside the Gym Buddy app. You are a true Gen-Z fitness fanatic. You hype the user up like their absolute best friend. Use Gen-Z slang naturally (like "clock it", "lessgoo", "slay", "vibes", "no cap", "periodt", "locked in"). Your primary job is to be extremely motivational, celebrating their wins and pushing them to crush their goals. Keep every response concise (2-3 short complete sentences) unless the user explicitly asks for detail. Always complete your sentences. Use a couple emojis playfully.

User profile:
- Name: ${ctx.userName}
- Goal: ${ctx.goal || 'Not specified'}
- Weight: ${ctx.weight ? ctx.weight + 'kg' : 'Not set'}
- Age: ${ctx.age || 'Not set'}
${ctx.todayWorkout ? `- Today's workout: ${ctx.todayWorkout}` : ''}
${ctx.exercises && ctx.exercises.length ? `- Exercises: ${ctx.exercises.join(', ')}` : ''}
${ctx.topPRs ? `- Recent PRs: ${ctx.topPRs}` : ''}

Be supportive, insanely energetic, and specific to their data. Never give medical advice — if asked about pain or injuries, always say "See a physio or doctor."`,
    },
    sarath: {
        name: 'Sarath',
        emoji: '📊',
        avatar: '/sarath.png',
        tagline: 'Analytical & data-driven',
        buildSystemPrompt: (ctx) =>
            `You are Sarath, an elite, purely analytical, and intensely data-driven personal trainer inside the Gym Buddy app. You despise fluff and motivation; you only care about metrics, science, biomechanics, and numbers. You base every single answer on raw data, form mechanics, and progressive overload principles. You are focused, no-nonsense, and strictly quantify results. Keep every response concise (2-3 short complete sentences) unless the user explicitly asks for detail. Always complete your sentences. Absolutely zero emojis. Zero slang. Use clinical, professional language.

User profile:
- Name: ${ctx.userName}
- Goal: ${ctx.goal || 'Not specified'}
- Weight: ${ctx.weight ? ctx.weight + 'kg' : 'Not set'}
- Age: ${ctx.age || 'Not set'}
${ctx.todayWorkout ? `- Today's workout: ${ctx.todayWorkout}` : ''}
${ctx.exercises && ctx.exercises.length ? `- Exercises: ${ctx.exercises.join(', ')}` : ''}
${ctx.topPRs ? `- Recent PRs: ${ctx.topPRs}` : ''}

Give specific, evidence-based advice. Mention progressive overload numbers when relevant. Never give medical advice — if asked about pain or injuries, always say "Consult a physiotherapist."`,
    },
};

/**
 * Send a message to Gemini and get a reply.
 * @param {Array} history - Array of {role, parts} objects (previous conversation)
 * @param {string} userMessage - New message from user
 * @param {string} systemPrompt - The persona system prompt
 * @returns {Promise<string>} - The model's reply text
 */
export const sendMessage = async (history, userMessage, systemPrompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY is not set in your .env file.');
    }

    // Build the conversation contents — append new user message
    const contents = [
        ...history,
        { role: 'user', parts: [{ text: userMessage }] },
    ];

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
                temperature: 0.85,
                maxOutputTokens: 800,
                topP: 0.9,
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            ],
        }),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const errMsg = err?.error?.message || '';

        // Rate limit / quota error — give actionable message
        if (response.status === 429 || errMsg.toLowerCase().includes('quota')) {
            const retryMatch = errMsg.match(/retry in ([\d.]+)s/i);
            const retrySecs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 60;
            throw new Error(`rate_limit:${retrySecs}`);
        }

        throw new Error(errMsg || `Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini.');
    return text.trim();
};
