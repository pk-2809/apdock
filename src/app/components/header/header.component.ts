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
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { DietService, DietGoal, DietType } from '../../core/services/diet.service';
import { DietPreferenceModalComponent } from '../diet-preference-modal/diet-preference-modal.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, DietPreferenceModalComponent],
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

  // Active diet preferences
  readonly currentGoal = computed<DietGoal>(() => this.dietService.preference()?.goal || 'loss');
  readonly currentDietType = computed<DietType>(() => this.dietService.preference()?.dietType || 'veg');

  // PWA Check for Updates states
  readonly isCheckingUpdate = signal<boolean>(false);
  readonly updateStatusMessage = signal<string | null>(null);
  readonly isUpdateError = signal<boolean>(false);

  ngOnInit(): void {
    this.updateDietModuleState();
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
    this.isDietPrefMenuOpen.update((open) => !open);
  }

  closeDietPrefMenu(): void {
    this.isDietPrefMenuOpen.set(false);
  }

  async updateGoal(goal: DietGoal): Promise<void> {
    const currentType = this.currentDietType();
    await this.dietService.savePreference(goal, currentType);
  }

  async updateDietType(type: DietType): Promise<void> {
    const currentGoal = this.currentGoal();
    await this.dietService.savePreference(currentGoal, type);
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
    this.isDietPrefMenuOpen.set(false);
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
    this.deleteErrorMessage.set(null);
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteConfirmModal(): void {
    if (this.isDeleting()) {
      return;
    }
    this.showDeleteConfirmModal.set(false);
    this.deleteErrorMessage.set(null);
  }

  async handleConfirmDeleteAccount(): Promise<void> {
    this.isDeleting.set(true);
    this.deleteErrorMessage.set(null);
    try {
      await this.auth.deleteAccount();
      this.showDeleteConfirmModal.set(false);
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
