declare module 'canvas-confetti' {
    interface Options {
        particleCount?: number;
        spread?: number;
        origin?: { x?: number; y?: number };
        colors?: string[];
        startVelocity?: number;
        gravity?: number;
        scalar?: number;
        ticks?: number;
    }

    function confetti(options?: Options): Promise<null>;
    export = confetti;
}
