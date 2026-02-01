// Fast Food Order Notification System
// Handles sound alerts, browser notifications, and visual feedback

// Audio context for playing synthesized sounds
let audioContext: AudioContext | null = null;

// HTML Audio element for playing notification ringtone
let notificationAudio: HTMLAudioElement | null = null;
let ringtonePlaying = false;

// Initialize audio context (must be called after user interaction)
export function initAudioContext() {
    if (!audioContext && typeof window !== 'undefined') {
        audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContext;
}

// Initialize notification audio element
export function initNotificationAudio() {
    if (!notificationAudio && typeof window !== 'undefined') {
        notificationAudio = new Audio('/sounds/ringtone-030-437513.mp3');
        notificationAudio.loop = true; // Loop until stopped
        notificationAudio.volume = 0.8;
    }
    return notificationAudio;
}

// Play the notification ringtone (loops until stopped)
export function playRingtone() {
    try {
        const audio = initNotificationAudio();
        if (audio && !ringtonePlaying) {
            audio.currentTime = 0;
            audio.play().catch(err => console.warn('Audio playback failed:', err));
            ringtonePlaying = true;
        }
    } catch (error) {
        console.warn('Ringtone playback failed:', error);
    }
}

// Stop the notification ringtone
export function stopRingtone() {
    try {
        if (notificationAudio && ringtonePlaying) {
            notificationAudio.pause();
            notificationAudio.currentTime = 0;
            ringtonePlaying = false;
        }
    } catch (error) {
        console.warn('Ringtone stop failed:', error);
    }
}

// Check if ringtone is currently playing
export function isRingtonePlaying(): boolean {
    return ringtonePlaying;
}

// Play a beep sound using Web Audio API (for non-critical notifications)
export function playNotificationSound(type: 'newOrder' | 'statusChange' | 'alert' = 'newOrder') {
    try {
        // For new orders, play the ringtone instead of beep
        if (type === 'newOrder') {
            playRingtone();
            return;
        }

        const ctx = initAudioContext();
        if (!ctx) return;

        // Resume context if suspended (required by some browsers)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Different sound patterns for different notification types
        switch (type) {
            case 'statusChange':
                // Single soft beep
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.3);
                break;
            case 'alert':
                // Warning beep
                oscillator.frequency.value = 440;
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                oscillator.start(ctx.currentTime);
                oscillator.stop(ctx.currentTime + 0.5);
                break;
        }
    } catch (error) {
        console.warn('Audio playback failed:', error);
    }
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
}

// Show browser notification
export function showBrowserNotification(title: string, body: string, options?: { icon?: string; tag?: string }) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return;
    }

    if (Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body,
            icon: options?.icon || '/icons/icon-192x192.png',
            tag: options?.tag || 'order-notification',
            requireInteraction: true, // Stay until user interacts
        });

        notification.onclick = () => {
            window.focus();
            notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
    }
}

// Update page title with order count
export function updatePageTitle(pendingCount: number) {
    if (typeof document === 'undefined') return;

    const baseTitle = 'Siparişler | TikProfil';

    if (pendingCount > 0) {
        document.title = `(${pendingCount}) Yeni Sipariş! | TikProfil`;
    } else {
        document.title = baseTitle;
    }
}

// Flash the browser tab (for background tabs)
let flashInterval: NodeJS.Timeout | null = null;

export function flashTab(enable: boolean) {
    if (typeof document === 'undefined') return;

    if (!enable && flashInterval) {
        clearInterval(flashInterval);
        flashInterval = null;
        document.title = 'Siparişler | TikProfil';
        return;
    }

    if (enable && !flashInterval) {
        let isFlashing = false;
        flashInterval = setInterval(() => {
            document.title = isFlashing ? '🔔 YENİ SİPARİŞ!' : '⚡ SİPARİŞ BEKLİYOR!';
            isFlashing = !isFlashing;
        }, 500);
    }
}

// Check if notification sound is enabled (localStorage)
export function isSoundEnabled(): boolean {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem('ff_sound_enabled') !== 'false';
}

export function setSoundEnabled(enabled: boolean) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('ff_sound_enabled', enabled ? 'true' : 'false');
}

// Vibrate device (mobile)
export function vibrateDevice(pattern: number[] = [200, 100, 200]) {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
    }
}
