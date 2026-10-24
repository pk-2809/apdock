import { Component, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SplashScreenComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly showSplash = signal<boolean>(true);
  readonly currentTheme = signal<'system' | 'light' | 'dark'>('system');

  constructor() {
    effect(() => {
      const mode = this.currentTheme();
      if (typeof document !== 'undefined') {
        if (mode === 'system') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', mode);
        }
      }
    });
  }

  setTheme(mode: 'light' | 'dark' | 'system'): void {
    this.currentTheme.set(mode);
  }

  onSplashFinished(): void {
    this.showSplash.set(false);
  }

  triggerSplash(): void {
    this.showSplash.set(true);
  }
}
