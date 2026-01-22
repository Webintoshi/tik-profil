"use client";

import { useEffect, useRef, useState } from "react";

export function QRWorldAnimation() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // Başlangıçta dünya, sonra logo olacak ve öyle kalacak
    const [animationState, setAnimationState] = useState<'globe' | 'logo'>('globe');
    const mousePos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 1. BOYUTLANDIRMA
        const resize = () => {
            const width = container.clientWidth || 500;
            const height = container.clientHeight || 500;
            const dpr = window.devicePixelRatio || 1;
            
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);
            
            return { width, height };
        };

        let { width, height } = resize();
        window.addEventListener('resize', () => {
            const size = resize();
            width = size.width;
            height = size.height;
        });

        // 2. VERİ HAZIRLIĞI
        const numPoints = 1500;
        const points: any[] = [];
        const phi = Math.PI * (3 - Math.sqrt(5));

        const logoBlocks = [
            { x: -1, y: -1, type: 'primary' }, { x: 0, y: -1, type: 'primary' }, { x: 1, y: -1, type: 'primary' },
            { x: -1, y: 0, type: 'secondary' }, { x: 0, y: 0, type: 'primary' }, { x: 1, y: 0, type: 'secondary' },
            { x: -1, y: 1, type: 'secondary' }, { x: 0, y: 1, type: 'primary' }, { x: 1, y: 1, type: 'secondary' }
        ];

        for(let i = 0; i < numPoints; i++) {
            const y = 1 - (i / (numPoints - 1)) * 2;
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            
            const block = logoBlocks[Math.floor(Math.random() * logoBlocks.length)];
            const blockSize = 0.55;
            const gap = 0.65;
            const lx = (block.x * gap) + (Math.random() - 0.5) * blockSize;
            const ly = (block.y * gap) + (Math.random() - 0.5) * blockSize;

            const chaosDir = Math.random() * Math.PI * 2;
            const chaosDist = 2 + Math.random() * 3;

            points.push({
                gx: Math.cos(theta) * radius,
                gy: y,
                gz: Math.sin(theta) * radius,
                lx: lx,
                ly: ly,
                lz: (Math.random() - 0.5) * 0.5,
                type: block.type,
                cx: Math.cos(chaosDir) * chaosDist,
                cy: Math.sin(chaosDir) * chaosDist,
                cz: (Math.random() - 0.5) * chaosDist
            });
        }

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            mousePos.current = {
                x: (e.clientX - rect.left) / rect.width - 0.5,
                y: (e.clientY - rect.top) / rect.height - 0.5
            };
        };
        container.addEventListener('mousemove', handleMouseMove);

        // 3. ANİMASYON DÖNGÜSÜ
        let rotation = 0;
        let progress = 0;
        let animationId: number;
        
        // Intro Zamanlaması
        const startTime = Date.now();
        const delay = 5000; // 5 saniye bekle

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            const now = Date.now();
            const elapsed = now - startTime;

            // Hedef Durum Belirleme
            let targetProgress = 0;
            if (elapsed > delay) {
                targetProgress = 1; // 3 saniye sonra logoya dönüş
            }

            // State güncelleme (Metin animasyonu için)
            if (targetProgress === 1 && progress > 0.5) {
                // React state güncellemesini animasyon döngüsünde sürekli yapmamak için kontrol
                // (Burada useRef veya basit bir flag kullanmak daha performanslı olur ama
                // React'in batching'i sayesinde bu da çalışır, ancak dikkatli olmak lazım.
                // Şimdilik state'i render dışında useEffect ile de yapabilirdik ama
                // senkronizasyon için burada basit bir kontrol yeterli.)
                // setAnimationState('logo'); // Bunu aşağıda yapalım
            }

            // Hızlanma ve yavaşlama (Sinematik)
            const speed = 0.02; 
            progress += (targetProgress - progress) * speed;

            const centerX = width / 2;
            const centerY = height / 2 - 40; // Biraz yukarı kaydırıldı
            const globeRadius = Math.min(width, height) * 0.35; // Küçültüldü (0.45 -> 0.35)
            const logoScale = Math.min(width, height) * 0.38; // Logo aynı kaldı

            // Dönüş sadece dünya modunda veya geçiş sırasında
            // Logo olduğunda (progress ~ 1) dönüşü durdurabiliriz veya çok yavaşlatabiliriz
            rotation += 0.005 * (1 - progress * 0.9); 

            const explosion = Math.sin(progress * Math.PI); 

            // Mouse Tilt (Parallax) - Logo modunda daha belirgin
            const tiltX = mousePos.current.x * 0.5 * progress;
            const tiltY = mousePos.current.y * 0.5 * progress;

            points.forEach(p => {
                const rotatedX = p.gx * Math.cos(rotation) - p.gz * Math.sin(rotation);
                const rotatedZ = p.gx * Math.sin(rotation) + p.gz * Math.cos(rotation);

                const lRotX = p.lx * Math.cos(tiltX) - p.lz * Math.sin(tiltX);
                const lRotZ = p.lx * Math.sin(tiltX) + p.lz * Math.cos(tiltX);
                const lRotY = p.ly;

                let x = (rotatedX * globeRadius) * (1 - progress) + (lRotX * logoScale) * progress;
                let y = (p.gy * globeRadius) * (1 - progress) + (lRotY * logoScale) * progress;
                let z = (rotatedZ * globeRadius) * (1 - progress) + (lRotZ * logoScale) * progress;

                x += p.cx * explosion * 100;
                y += p.cy * explosion * 100;
                z += p.cz * explosion * 100;

                const perspective = 600;
                const scale = perspective / (perspective - z);
                const screenX = centerX + x * scale;
                const screenY = centerY + y * scale;

                const size = (progress > 0.5 ? 4 : 3) * scale;

                let r, g, b, alpha;
                if (progress > 0.5) {
                    if (p.type === 'primary') {
                        r=59; g=130; b=246; alpha=0.9 + z/200;
                    } else {
                        r=148; g=163; b=184; alpha=0.4 + z/200;
                    }
                } else {
                    r=59; g=130; b=246; alpha=Math.max(0.15, (z + globeRadius) / (globeRadius * 2));
                }

                if (explosion > 0.1) {
                    r += explosion * 100;
                    g += explosion * 100;
                    b += explosion * 100;
                    alpha = 1;
                }

                ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
                ctx.beginPath();
                ctx.rect(screenX - size/2, screenY - size/2, size, size);
                ctx.fill();
            });

            animationId = requestAnimationFrame(render);
        };

        render();

        // State güncellemesi için ayrı bir timer (Render döngüsünü kirletmemek için)
        const stateTimer = setTimeout(() => {
            setAnimationState('logo');
        }, delay + 500); // 1.5sn bekle + 0.5sn geçiş payı

        return () => {
            window.removeEventListener('resize', resize);
            container.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
            clearTimeout(stateTimer);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center bg-transparent group perspective-1000"
        >
            <canvas 
                ref={canvasRef} 
                className="transition-all duration-700 ease-out"
            />
            
            {/* DÜNYA METNİ (Başlangıçta var, sonra kaybolur) */}
            <div className={`absolute bottom-4 flex flex-col items-center gap-2 pointer-events-none transition-all duration-1000 ${animationState === 'logo' ? 'opacity-0 scale-90 blur-sm translate-y-4' : 'opacity-100 scale-100 blur-0 translate-y-0'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                    <span className="text-xs font-bold text-slate-500 tracking-widest uppercase">DÜNYANI KEŞFET</span>
                </div>
            </div>

            {/* LOGO METNİ (Sonradan gelir ve kalır) */}
            <div className={`absolute bottom-4 flex flex-col items-center gap-1 pointer-events-none transition-all duration-1000 ${animationState === 'logo' ? 'opacity-100 scale-100 blur-0 translate-y-0 delay-500' : 'opacity-0 scale-110 blur-sm translate-y-4'}`}>
                <span className="text-2xl font-black text-slate-800 tracking-tighter">TIK PROFIL</span>
                <div className="flex items-center gap-2">
                    <div className="h-[1px] w-4 bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.3em]">DİJİTAL KİMLİK</span>
                    <div className="h-[1px] w-4 bg-blue-500"></div>
                </div>
            </div>
        </div>
    );
}
