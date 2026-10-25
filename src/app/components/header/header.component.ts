import {
  Component,
  inject,
  signal,
  computed,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  Input
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { DietService, DietGoal, DietType } from '../../core/services/diet.service';
import { DietPreferenceModalComponent } from '../diet-preference-modal/diet-preference-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, DietPreferenceModalComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly themeService = inject(ThemeService);
  readonly dietService = inject(DietService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private routerSub?: Subscription;

  // Settings dropdown & confirmation modal states
  readonly isMenuOpen = signal<boolean>(false);
  readonly showDeleteConfirmModal = signal<boolean>(false);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteErrorMessage = signal<string | null>(null);
  deletePin = '';

  // Diet Preference Popover state (only visible inside diet module)
  readonly isDietModule = signal<boolean>(false);
  readonly isDietPrefMenuOpen = signal<boolean>(false);
  readonly isDietModalOpen = signal<boolean>(false);

  // Optional input override for testing or manual control
  @Input() set inDietModule(value: boolean | undefined) {
    if (value !== undefined) {
      this.isDietModule.set(value);
    }
  }

  // Active saved diet preferences
  readonly currentGoal = computed<DietGoal>(() => this.dietService.preference()?.goal || 'loss');
  readonly currentDietType = computed<DietType>(() => this.dietService.preference()?.dietType || 'veg');

  // Staged diet preferences for popover menu (prevents API call on every toggle, syncs on menu close)
  readonly stagedGoal = signal<DietGoal>('loss');
  readonly stagedDietType = signal<DietType>('veg');
  readonly animatingTab = signal<string | null>(null);

  // PWA Check for Updates states
  readonly isCheckingUpdate = signal<boolean>(false);
  readonly updateStatusMessage = signal<string | null>(null);
  readonly isUpdateError = signal<boolean>(false);

  ngOnInit(): void {
    this.updateDietModuleState();
    this.stagedGoal.set(this.currentGoal());
    this.stagedDietType.set(this.currentDietType());
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateDietModuleState();
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private updateDietModuleState(): void {
    const url = this.router.url || '';
    this.isDietModule.set(url.includes('/diet'));
  }

  toggleDietPrefMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.isMenuOpen.set(false);
    if (this.isDietPrefMenuOpen()) {
      this.closeDietPrefMenu();
    } else {
      this.stagedGoal.set(this.currentGoal());
      this.stagedDietType.set(this.currentDietType());
      this.isDietPrefMenuOpen.set(true);
    }
  }

  async closeDietPrefMenu(): Promise<void> {
    if (!this.isDietPrefMenuOpen()) {
      return;
    }
    this.isDietPrefMenuOpen.set(false);

    // Sync to backend / diet service only on menu close if preferences actually changed
    const savedGoal = this.currentGoal();
    const savedType = this.currentDietType();
    const newGoal = this.stagedGoal();
    const newType = this.stagedDietType();

    if (newGoal !== savedGoal || newType !== savedType) {
      await this.dietService.savePreference(newGoal, newType);
    }
  }

  navigateHome(): void {
    this.router.navigate(['/home']);
  }

  triggerTabAnimation(tabId: string): void {
    this.animatingTab.set(tabId);
    setTimeout(() => {
      if (this.animatingTab() === tabId) {
        this.animatingTab.set(null);
      }
    }, 650);
  }

  updateGoal(goal: DietGoal): void {
    this.triggerTabAnimation(goal);
    this.stagedGoal.set(goal);
    // User requirement: on change it should NOT trigger API call, it should trigger on menu close.
  }

  updateDietType(type: DietType): void {
    this.triggerTabAnimation(type);
    this.stagedDietType.set(type);
    // User requirement: on change it should NOT trigger API call, it should trigger on menu close.
  }

  openFullDietModal(): void {
    this.closeDietPrefMenu();
    this.isDietModalOpen.set(true);
  }

  closeFullDietModal(): void {
    this.isDietModalOpen.set(false);
  }

  toggleMenu(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.closeDietPrefMenu();
    this.isMenuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  async handleSignOut(): Promise<void> {
    this.closeMenu();
    try {
      await this.auth.signOut();
    } finally {
      await this.router.navigate(['/auth']);
    }
  }

  openDeleteConfirmModal(): void {
    this.closeMenu();
    this.deletePin = '';
    this.deleteErrorMessage.set(null);
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteConfirmModal(): void {
    if (this.isDeleting()) {
      return;
    }
    this.deletePin = '';
    this.showDeleteConfirmModal.set(false);
    this.deleteErrorMessage.set(null);
  }

  async handleConfirmDeleteAccount(): Promise<void> {
    const cleanPin = this.deletePin.trim();
    if (!cleanPin || cleanPin.length !== 6) {
      this.deleteErrorMessage.set('Please enter your 6-digit PIN to confirm deletion.');
      return;
    }

    this.isDeleting.set(true);
    this.deleteErrorMessage.set(null);
    try {
      await this.auth.deleteAccount(cleanPin);
      this.showDeleteConfirmModal.set(false);
      this.deletePin = '';
      await this.router.navigate(['/auth']);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete account. Please try again.';
      this.deleteErrorMessage.set(message);
    } finally {
      this.isDeleting.set(false);
    }
  }

  async checkForUpdates(): Promise<void> {
    if (this.isCheckingUpdate()) {
      return;
    }

    this.isCheckingUpdate.set(true);
    this.isUpdateError.set(false);
    this.updateStatusMessage.set('Checking for latest build...');

    if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
      this.isCheckingUpdate.set(false);
      this.isUpdateError.set(true);
      this.updateStatusMessage.set('Device is offline. Connect to internet to update.');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.update();
            if (registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          }
        } catch (swErr) {
          console.warn('ServiceWorker update check:', swErr);
        }
      }

      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
        } catch (cacheErr) {
          console.warn('CacheStorage purge check:', cacheErr);
        }
      }

      this.updateStatusMessage.set('Applying latest build & refreshing...');

      if (typeof window !== 'undefined') {
        try {
          await fetch('/?_pwa_bust=' + Date.now(), {
            cache: 'reload',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache'
            }
          });
        } catch {}
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
      this.reloadWindow();
    } catch {
      this.isUpdateError.set(true);
      this.updateStatusMessage.set('Could not check updates. Please retry.');
      this.isCheckingUpdate.set(false);
    }
  }

  reloadWindow(): void {
    if (typeof window !== 'undefined' && window.location) {
      try {
        window.location.reload();
      } catch {}
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.closeMenu();
      this.closeDietPrefMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showDeleteConfirmModal() && !this.isDeleting()) {
      this.closeDeleteConfirmModal();
    } else if (this.isMenuOpen()) {
      this.closeMenu();
    } else if (this.isDietPrefMenuOpen()) {
      this.closeDietPrefMenu();
    }
  }
}
