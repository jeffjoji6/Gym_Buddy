import React from 'react';

/**
 * AppLogo — renders the static dumbbell icon for use in the header, sidebar, etc.
 * For the intro splash screen use the gym.mp4 video directly.
 */
export default function AppLogo({ size = 22, style = {} }) {
    return (
        <img
            src="/logo.png"
            alt="Gym Buddy Logo"
            width={size}
            height={size}
            style={{
                objectFit: 'contain',
                borderRadius: '50%',
                ...style
            }}
        />
    );
}
