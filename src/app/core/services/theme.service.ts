import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly currentTheme = signal<ThemeMode>('system');

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

  setTheme(mode: ThemeMode): void {
    this.currentTheme.set(mode);
  }
}
