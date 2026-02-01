"use client";

export function LiquidMetalBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            {/* Base Color - Clean Dark Gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'linear-gradient(135deg, #0d0d12 0%, #0a0a10 50%, #08080d 100%)'
                }}
            />

            {/* Static Subtle Gradient Overlays - No Animation */}
            <div
                className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(139,92,246,0.08) 35%, transparent 60%)',
                    filter: 'blur(80px)',
                }}
            />

            <div
                className="absolute bottom-[-15%] right-[-5%] w-[800px] h-[800px] rounded-full"
                style={{
                    background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, rgba(168,85,247,0.06) 35%, transparent 60%)',
                    filter: 'blur(80px)',
                }}
            />

            {/* Subtle Gradient Overlay - Adds Depth */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.05) 0%, transparent 50%)'
                }}
            />

            {/* Visible Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px'
                }}
            />
        </div>
    );
}
