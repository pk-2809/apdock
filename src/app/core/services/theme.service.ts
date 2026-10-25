import { Injectable, signal, effect, inject, DestroyRef } from '@angular/core';
import { AuthService } from './auth.service';

export type ThemeMode = 'system' | 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentTheme = signal<ThemeMode>(this.getInitialTheme());

  private readonly darkHex = '#080b13';
  private readonly lightHex = '#ffffff';

  constructor() {
    this.initSystemListener();
    this.initAuthSync();

    // Effect to apply theme changes to DOM and dynamic theme-color meta
    effect(() => {
      const mode = this.currentTheme();
      this.applyTheme(mode);
    });
  }

  private getInitialTheme(): ThemeMode {
    if (typeof localStorage === 'undefined') return 'system';
    try {
      // Check for cached profile UID
      let cachedUid: string | null = null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('apdock_profile_')) {
          cachedUid = k.replace('apdock_profile_', '');
          break;
        }
      }
      if (cachedUid) {
        const userTheme = localStorage.getItem(`apdock_${cachedUid}_theme`) as ThemeMode | null;
        if (userTheme === 'light' || userTheme === 'dark' || userTheme === 'system') {
          return userTheme;
        }
      }
      const deviceTheme = localStorage.getItem('apdock_device_theme') as ThemeMode | null;
      if (deviceTheme === 'light' || deviceTheme === 'dark' || deviceTheme === 'system') {
        return deviceTheme;
      }
    } catch {}
    return 'system';
  }

  private initSystemListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (): void => {
      if (this.currentTheme() === 'system') {
        this.applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
      this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', listener));
    } else {
      mediaQuery.addListener(listener);
      this.destroyRef.onDestroy(() => mediaQuery.removeListener(listener));
    }
  }

  private initAuthSync(): void {
    // When user logs in, load their scoped theme preference
    effect(() => {
      const user = this.auth.currentUser();
      if (user?.uid && typeof localStorage !== 'undefined') {
        const scoped = localStorage.getItem(`apdock_${user.uid}_theme`) as ThemeMode | null;
        if (scoped && (scoped === 'light' || scoped === 'dark' || scoped === 'system')) {
          if (this.currentTheme() !== scoped) {
            this.currentTheme.set(scoped);
          }
        }
      }
    });
  }

  setTheme(mode: ThemeMode): void {
    this.currentTheme.set(mode);

    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('apdock_device_theme', mode);
        const user = this.auth.currentUser();
        if (user?.uid) {
          localStorage.setItem(`apdock_${user.uid}_theme`, mode);
        }
      } catch (err) {
        console.warn('Failed to persist theme in localStorage:', err);
      }
    }
  }

  private applyTheme(mode: ThemeMode): void {
    if (typeof document === 'undefined') return;

    let isDark = true;
    if (mode === 'light') {
      isDark = false;
    } else if (mode === 'dark') {
      isDark = true;
    } else {
      isDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // Set data-theme on root HTML element
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Dynamic <meta name="theme-color"> updates
    const activeColor = isDark ? this.darkHex : this.lightHex;
    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    themeMetas.forEach((meta) => {
      meta.setAttribute('content', activeColor);
    });
  }
}
