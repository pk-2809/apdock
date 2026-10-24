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
    // Automatically close splash screen after 2.3 seconds
    this.autoCloseTimer = setTimeout(() => {
      this.dismiss();
    }, 2300);
  }

  ngOnDestroy(): void {
    this.clearAllTimers();
  }

  dismiss(): void {
    if (this.isLeaving()) return;
    this.isLeaving.set(true);
    this.clearAllTimers();

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(18);
      } catch {
        // vibration optional
      }
    }

    this.exitTransitionTimer = setTimeout(() => {
      this.finished.emit();
    }, 400); // Matches CSS transition duration
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
