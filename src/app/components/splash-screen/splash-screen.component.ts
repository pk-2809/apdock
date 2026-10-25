import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  output,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-splash-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash-screen.component.html',
  styleUrl: './splash-screen.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SplashScreenComponent implements OnInit, OnDestroy {
  // Event emitted when splash finishes
  readonly finished = output<void>();

  // Animation state
  readonly isLeaving = signal<boolean>(false);

  private autoCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private exitTransitionTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    // 1. Skip brand animation on warm starts (sessionStorage flag or SW-controlled resume)
    const isWarmStart =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('apdock_splash_shown') === '1') ||
      (typeof navigator !== 'undefined' && !!navigator.serviceWorker?.controller && typeof sessionStorage !== 'undefined' && sessionStorage.getItem('apdock_splash_shown') === '1');

    if (isWarmStart) {
      this.finished.emit();
      return;
    }

    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('apdock_splash_shown', '1');
      } catch {}
    }

    // 2. Cold start: keep at most ~1s and never block interactivity
    this.autoCloseTimer = setTimeout(() => {
      this.dismiss(false);
    }, 800);
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  dismiss(isUserGesture = false): void {
    if (this.isLeaving()) return;
    this.isLeaving.set(true);
    this.clearAllTimers();

    if (isUserGesture && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(18);
      } catch {
        // vibration optional
      }
    }

    this.exitTransitionTimer = setTimeout(() => {
      this.finished.emit();
    }, 200); // Fast snappy transition
  }

  private clearAllTimers(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
    if (this.exitTransitionTimer) {
      clearTimeout(this.exitTransitionTimer);
      this.exitTransitionTimer = null;
    }
  }
}
