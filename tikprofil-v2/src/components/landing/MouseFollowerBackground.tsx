"use client";

import { useRef, useState } from "react";
import { FloatingOrb } from "./FloatingOrb";

export function MouseFollowerBackground() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<NodeJS.Timeout>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                setMousePos({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                });
            }
        }, 16);
    };

    return (
        <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        >
            <div
                className="absolute inset-0 pointer-events-none transition-all duration-300"
                style={{
                    background: `radial-gradient(1000px at ${mousePos.x}px ${mousePos.y}px, rgba(59,130,246,0.08), transparent)`
                }}
            />
            
            {/* Global Orbs - Distributed across the page with Hero's original colors */}
            <FloatingOrb className="w-96 h-96 bg-blue-400/15 top-20 -left-20" delay={0} />
            <FloatingOrb className="w-80 h-80 bg-purple-400/15 top-[600px] right-20" delay={2} />
            <FloatingOrb className="w-72 h-72 bg-pink-400/15 top-[1200px] left-1/3" delay={4} />
            <FloatingOrb className="w-96 h-96 bg-blue-400/15 top-[1800px] -right-20" delay={1} />
            <FloatingOrb className="w-64 h-64 bg-purple-400/15 top-[2400px] left-20" delay={3} />
            <FloatingOrb className="w-80 h-80 bg-pink-400/15 top-[3000px] right-1/4" delay={5} />
            <FloatingOrb className="w-[500px] h-[500px] bg-blue-400/10 bottom-0 left-1/2 -translate-x-1/2" delay={2} />
        </div>
    );
}
