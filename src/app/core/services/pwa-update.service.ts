import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent, VersionInstallationFailedEvent } from '@angular/service-worker';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

declare const __APP_VERSION__: string;

export type UpdateCheckResult = 'up-to-date' | 'ready' | 'offline';

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly updateAvailable = signal<boolean>(false);
  readonly updateFailed = signal<boolean>(false);
  readonly isChecking = signal<boolean>(false);
  readonly updateStatusMessage = signal<string>('');
  readonly appVersion = signal<string>(
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.2.0'
  );

  private pendingApply = false;
  private readonly updateRetryKey = 'apdock_update_retry_count';

  constructor() {
    this.initLifecycle();
  }

  private initLifecycle(): void {
    if (!this.swUpdate || !this.swUpdate.isEnabled) {
      return;
    }

    // 1. Listen for new version readiness
    const versionSub = this.swUpdate.versionUpdates.subscribe((evt) => {
      if (evt.type === 'VERSION_READY') {
        const readyEvt = evt as VersionReadyEvent;
        this.updateAvailable.set(true);
        this.updateStatusMessage.set('New version ready - Reload');
      } else if (evt.type === 'VERSION_INSTALLATION_FAILED') {
        const failedEvt = evt as VersionInstallationFailedEvent;
        console.error('ServiceWorker version installation failed:', failedEvt.error);
        this.handleFailure();
      }
    });
    this.destroyRef.onDestroy(() => versionSub.unsubscribe());

    // 2. Handle unrecoverable SW state with loop guard
    const unrecovSub = this.swUpdate.unrecoverable.subscribe((evt) => {
      console.error('ServiceWorker in unrecoverable state:', evt.reason);
      this.handleFailure();
    });
    this.destroyRef.onDestroy(() => unrecovSub.unsubscribe());

    // 3. Router navigation listener to trigger pending reloads on navigation to /home
    const navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        if (this.pendingApply && (event.urlAfterRedirects.includes('/home') || !this.isOverlayActive())) {
          this.executeReload();
        }
      });
    this.destroyRef.onDestroy(() => navSub.unsubscribe());

    // 4. Update check on start, visibilitychange to visible, and 30-min interval
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      setTimeout(() => {
        this.checkForUpdate();
      }, 2000);

      const visibilityHandler = (): void => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdate();
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      this.destroyRef.onDestroy(() => {
        document.removeEventListener('visibilitychange', visibilityHandler);
      });

      const intervalId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.checkForUpdate();
        }
      }, 30 * 60 * 1000);
      this.destroyRef.onDestroy(() => clearInterval(intervalId));
    }
  }

  /**
   * Checks whether any modal, recipe sheet, or preference popover is currently active in the DOM.
   */
  isOverlayActive(): boolean {
    if (typeof document === 'undefined') return false;
    const overlaySelectors = [
      '.modal-backdrop',
      '.sheet-container',
      '.diet-preference-modal-root',
      '.add-recipe-modal-root',
      '.move-modal-root',
      '.confirm-delete-backdrop',
      '.popover-dropdown',
      '.recipe-modal-backdrop'
    ];
    return overlaySelectors.some((sel) => !!document.querySelector(sel));
  }

  /**
   * Called by components when an overlay closes to flush deferred updates.
   */
  notifyOverlayClosed(): void {
    if (this.pendingApply && !this.isOverlayActive()) {
      this.executeReload();
    }
  }

  /**
   * User-initiated or system-triggered reload action.
   * If any overlay is active, the reload is deferred until closed or until next navigation to /home.
   */
  async applyUpdate(): Promise<void> {
    if (this.isOverlayActive()) {
      this.pendingApply = true;
      this.updateStatusMessage.set('Update deferred until current dialog closes');
      return;
    }

    await this.executeReload();
  }

  private async executeReload(): Promise<void> {
    try {
      this.pendingApply = false;
      if (this.swUpdate && this.swUpdate.isEnabled) {
        await this.swUpdate.activateUpdate();
      }
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to activate SW update:', err);
      this.handleFailure();
    }
  }

  private handleFailure(): void {
    this.updateFailed.set(true);
    this.updateStatusMessage.set('Update failed, reload');

    if (typeof sessionStorage !== 'undefined') {
      const retryCount = parseInt(sessionStorage.getItem(this.updateRetryKey) || '0', 10);
      if (retryCount < 1) {
        sessionStorage.setItem(this.updateRetryKey, String(retryCount + 1));
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }, 1500);
      } else {
        sessionStorage.removeItem(this.updateRetryKey);
        console.warn('Update failure loop guard triggered; halting automatic reload.');
      }
    }
  }

  retryUpdate(): void {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  /**
   * Manually checks for updates with status reporting.
   */
  async checkForUpdate(): Promise<UpdateCheckResult> {
    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      this.updateStatusMessage.set("You're offline");
      return 'offline';
    }

    if (!this.swUpdate || !this.swUpdate.isEnabled) {
      this.updateStatusMessage.set("You're up to date");
      return 'up-to-date';
    }

    this.isChecking.set(true);
    try {
      const hasUpdate = await this.swUpdate.checkForUpdate();
      if (hasUpdate) {
        this.updateAvailable.set(true);
        this.updateStatusMessage.set('Update ready - Reload');
        return 'ready';
      } else {
        this.updateStatusMessage.set("You're up to date");
        return 'up-to-date';
      }
    } catch (err) {
      console.warn('checkForUpdate error:', err);
      this.updateStatusMessage.set("You're offline");
      return 'offline';
    } finally {
      this.isChecking.set(false);
    }
  }
}
