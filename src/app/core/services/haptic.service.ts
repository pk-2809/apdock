import { Injectable, signal } from '@angular/core';

export type HapticType = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'pop' | 'island';

@Injectable({
  providedIn: 'root'
})
export class HapticService {
  /** Global toggle to mute or enable audio-synthesized haptics */
  readonly isSoundEnabled = signal<boolean>(true);
  readonly isVibrationSupported = signal<boolean>(typeof navigator !== 'undefined' && 'vibrate' in navigator);

  private audioCtx: AudioContext | null = null;

  constructor() {
    // Lazy initialize on first interaction to respect autoplay policies
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Triggers dual-channel physical vibration + acoustic Taptic feedback
   */
  trigger(type: HapticType = 'light'): void {
    // 1. Hardware vibration if supported (Android, PWA, Chrome Mobile)
    this.triggerHardwareVibration(type);

    // 2. High-fidelity acoustic impulse (iOS Safari & Mobile Web)
    if (this.isSoundEnabled()) {
      this.triggerAcousticImpulse(type);
    }
  }

  toggleSound(): boolean {
    const next = !this.isSoundEnabled();
    this.isSoundEnabled.set(next);
    if (next) this.trigger('success');
    return next;
  }

  private triggerHardwareVibration(type: HapticType): void {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    try {
      switch (type) {
        case 'selection':
        case 'light':
          navigator.vibrate(8);
          break;
        case 'medium':
        case 'pop':
          navigator.vibrate(18);
          break;
        case 'heavy':
          navigator.vibrate([28, 15, 20]);
          break;
        case 'success':
          navigator.vibrate([12, 40, 18]);
          break;
        case 'warning':
          navigator.vibrate([25, 30, 25, 30, 40]);
          break;
        case 'island':
          navigator.vibrate([15, 20, 25]);
          break;
      }
    } catch {
      // Ignore vibration errors
    }
  }

  private triggerAcousticImpulse(type: HapticType): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'selection':
      case 'light': {
        // Ultra-short crisp micro-tick (simulates iOS haptic switch)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.012);

        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

        osc.start(now);
        osc.stop(now + 0.012);
        break;
      }

      case 'medium':
      case 'pop': {
        // Thuddy tactile tap
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.025);

        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        osc.start(now);
        osc.stop(now + 0.025);
        break;
      }

      case 'heavy': {
        // Deep resonant body thud
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.045);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        osc.start(now);
        osc.stop(now + 0.045);
        break;
      }

      case 'island': {
        // Springy elastic Dynamic Island expansion frequency slide
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(740, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(480, now + 0.07);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.start(now);
        osc.stop(now + 0.07);
        break;
      }

      case 'success': {
        // Ascending harmonic chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.0, now + 0.04); // A5

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }

      case 'warning': {
        // Low cautionary double buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(196, now);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
    }
  }
}
