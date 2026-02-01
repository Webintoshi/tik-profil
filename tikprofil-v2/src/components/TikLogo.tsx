import React from 'react';

interface TikLogoProps {
    className?: string;
    variant?: 'light' | 'dark'; // Hangi zeminde durduğunu belirtmek için
}

export const TikLogo: React.FC<TikLogoProps> = ({ className = "w-12 h-12", variant = 'light' }) => {

    // Eğer zemin beyazsa (variant='light'), hayalet blokları daha koyu gri yapıyoruz.
    // Eğer zemin siyahsa (variant='dark'), hayalet blokları daha açık/beyaz yapıyoruz.

    const ghostStartColor = variant === 'light' ? '#CBD5E1' : '#F3F4F6'; // Light modda daha koyu gri
    const ghostEndColor = variant === 'light' ? '#94A3B8' : '#D1D5DB';   // Light modda daha belirgin bitiş
    const ghostOpacity = variant === 'light' ? 0.6 : 0.4; // Beyaz zeminde daha opak olsun

    return (
        <svg
            className={className}
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Tik Profil Logo"
            role="img"
        >
            <defs>
                {/* --- Drop Shadow Filter --- */}
                <filter id="soft-drop-shadow" x="-20%" y="-20%" width="140%" height="150%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="blur" />
                    <feOffset in="blur" dx="0" dy="2" result="offsetBlur" />
                    <feFlood floodColor="rgba(0,0,0,0.15)" result="colorBlur" /> {/* Gölgeyi biraz yumuşattım */}
                    <feComposite in="colorBlur" in2="offsetBlur" operator="in" result="shadow" />
                    <feMerge>
                        <feMergeNode in="shadow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>

                {/* --- Brand Blue Gradient (Değişmez) --- */}
                <linearGradient id="brand-blue" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#60A5FA" />
                    <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>

                {/* --- Ghost Gradient (Dinamik) --- */}
                <linearGradient id={`ghost-fade-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={ghostStartColor} stopOpacity={ghostOpacity} />
                    <stop offset="100%" stopColor={ghostEndColor} stopOpacity="0.1" />
                </linearGradient>
            </defs>

            {/* --- GHOST BLOCKS (Arka Plan) --- */}

            {/* Orta Sıra Yanlar */}
            <rect x="0" y="42" width="36" height="36" rx="10" fill={`url(#ghost-fade-${variant})`} />
            <rect x="84" y="42" width="36" height="36" rx="10" fill={`url(#ghost-fade-${variant})`} />

            {/* Alt Sıra Yanlar (Daha Silik) */}
            <rect x="0" y="84" width="36" height="36" rx="10" fill={`url(#ghost-fade-${variant})`} opacity="0.6" />
            <rect x="84" y="84" width="36" height="36" rx="10" fill={`url(#ghost-fade-${variant})`} opacity="0.6" />


            {/* --- ACTIVE T SHAPE (Mavi Bloklar) --- */}
            <g filter="url(#soft-drop-shadow)">
                {/* Üst Satır */}
                <rect x="0" y="0" width="36" height="36" rx="10" fill="url(#brand-blue)" />
                <rect x="42" y="0" width="36" height="36" rx="10" fill="url(#brand-blue)" />
                <rect x="84" y="0" width="36" height="36" rx="10" fill="url(#brand-blue)" />

                {/* Orta Sütun */}
                <rect x="42" y="42" width="36" height="36" rx="10" fill="url(#brand-blue)" />
                <rect x="42" y="84" width="36" height="36" rx="10" fill="url(#brand-blue)" />
            </g>

            {/* --- Parlama Efekti (Gloss) --- */}
            <path d="M0 10C0 4.477 4.477 0 10 0H26C31.523 0 36 4.477 36 10V16C36 16 28 10 18 10C8 10 0 16 0 16V10Z" fill="white" fillOpacity="0.2" />
            <path d="M42 10C42 4.477 46.477 0 52 0H68C73.523 0 78 4.477 78 10V16C78 16 70 10 60 10C50 10 42 16 42 16V10Z" fill="white" fillOpacity="0.2" />
            <path d="M84 10C84 4.477 88.477 0 94 0H110C115.523 0 120 4.477 120 10V16C120 16 112 10 102 10C92 10 84 16 84 16V10Z" fill="white" fillOpacity="0.2" />

        </svg>
    );
};
