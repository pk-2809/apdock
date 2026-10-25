import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { AuthService } from './auth.service';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class InstallService {
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  readonly canInstall = signal<boolean>(false);
  readonly isStandalone = signal<boolean>(this.checkIsStandalone());
  readonly isIos = signal<boolean>(this.checkIsIos());
  readonly showIosSheet = signal<boolean>(false);
  readonly bannerDismissed = signal<boolean>(this.checkIsBannerDismissed());

  // Qualification for Install CTA:
  // 1. Not already standalone
  // 2. User has saved a diet preference
  // 3. User has opened app a 2nd time or 24h passed
  readonly qualifiesForInstall = computed(() => {
    if (this.isStandalone()) return false;
    return this.checkHasSavedDiet() && this.checkHasMetUsageThreshold();
  });

  // Home banner displays only when qualified and not dismissed
  readonly showHomeBanner = computed(() => {
    return this.qualifiesForInstall() && !this.bannerDismissed();
  });

  private readonly bannerDismissKey = 'apdock_install_banner_dismissed_until';
  private readonly visitCountKey = 'apdock_app_visit_count';
  private readonly firstVisitKey = 'apdock_app_first_visit_ts';
  private readonly sessionVisitKey = 'apdock_session_active';

  constructor() {
    this.trackVisits();
    this.initInstallListeners();
    this.initAuthPersistenceTrigger();
  }

  private checkIsStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');
    return isStandaloneMode || isIosStandalone || isAndroidApp;
  }

  private checkIsIos(): boolean {
    if (typeof navigator === 'undefined') return false;
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  private checkIsBannerDismissed(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const until = localStorage.getItem(this.bannerDismissKey);
      if (!until) return false;
      return Date.now() < parseInt(until, 10);
    } catch {
      return false;
    }
  }

  private checkHasSavedDiet(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      if (localStorage.getItem('apdock_diet_preference')) return true;
      const user = this.auth.currentUser();
      if (user?.uid && localStorage.getItem(`apdock_${user.uid}_diet_preference`)) return true;
      if (this.auth.userProfile()?.dietPreference) return true;
    } catch {}
    return false;
  }

  private checkHasMetUsageThreshold(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      const count = parseInt(localStorage.getItem(this.visitCountKey) || '1', 10);
      if (count >= 2) return true;

      const firstVisit = parseInt(localStorage.getItem(this.firstVisitKey) || '0', 10);
      if (firstVisit > 0 && Date.now() - firstVisit >= 24 * 60 * 60 * 1000) {
        return true;
      }
    } catch {}
    return false;
  }

  private trackVisits(): void {
    if (typeof sessionStorage === 'undefined' || typeof localStorage === 'undefined') return;

    try {
      if (!localStorage.getItem(this.firstVisitKey)) {
        localStorage.setItem(this.firstVisitKey, String(Date.now()));
      }

      if (!sessionStorage.getItem(this.sessionVisitKey)) {
        sessionStorage.setItem(this.sessionVisitKey, '1');
        const currentCount = parseInt(localStorage.getItem(this.visitCountKey) || '0', 10);
        localStorage.setItem(this.visitCountKey, String(currentCount + 1));
      }
    } catch {}
  }

  private initInstallListeners(): void {
    if (typeof window === 'undefined') return;

    // Listen to display-mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const mqListener = (e: MediaQueryListEvent): void => {
      this.isStandalone.set(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', mqListener);
      this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', mqListener));
    }

    // Capture beforeinstallprompt for Chrome / Android / Desktop
    const bipHandler = (e: Event): void => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    };
    window.addEventListener('beforeinstallprompt', bipHandler);
    this.destroyRef.onDestroy(() => window.removeEventListener('beforeinstallprompt', bipHandler));

    // Handle appinstalled event
    const installedHandler = (): void => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isStandalone.set(true);
      this.requestPersistentStorage();
    };
    window.addEventListener('appinstalled', installedHandler);
    this.destroyRef.onDestroy(() => window.removeEventListener('appinstalled', installedHandler));
  }

  private initAuthPersistenceTrigger(): void {
    // Call storage.persist() when user is signed in
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (this.auth.isAuthenticated()) {
          this.requestPersistentStorage();
        }
      }, 3000);
    }
  }

  /**
   * Prompts the browser install dialog or opens iOS instructions sheet
   */
  async promptInstall(): Promise<void> {
    if (this.deferredPrompt) {
      try {
        await this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          await this.requestPersistentStorage();
        }
        this.deferredPrompt = null;
        this.canInstall.set(false);
      } catch (err) {
        console.warn('Error launching beforeinstallprompt:', err);
      }
    } else if (this.isIos() && !this.isStandalone()) {
      this.showIosSheet.set(true);
    }
  }

  closeIosSheet(): void {
    this.showIosSheet.set(false);
  }

  dismissBanner(): void {
    this.bannerDismissed.set(true);
    if (typeof localStorage !== 'undefined') {
      try {
        const fourteenDays = Date.now() + 14 * 24 * 60 * 60 * 1000;
        localStorage.setItem(this.bannerDismissKey, String(fourteenDays));
      } catch {}
    }
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('apdock_storage_persisted', String(persisted));
        }
        return persisted;
      } catch (err) {
        console.warn('Storage persist request exception:', err);
      }
    }
    return false;
  }
}
