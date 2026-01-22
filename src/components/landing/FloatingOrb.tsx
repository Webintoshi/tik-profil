import React from 'react';

export function FloatingOrb({ className, delay }: { className?: string, delay?: number }) {
    const style = {
        animationDelay: `${delay || 0}s`
    };

    return (
        <div
            className={`absolute rounded-full blur-3xl animate-orb-float ${className}`}
            style={style}
        />
    );
}
