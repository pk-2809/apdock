import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { DietPreferenceModalComponent } from '../../components/diet-preference-modal/diet-preference-modal.component';
import { AuthService } from '../../core/services/auth.service';
import { DietService } from '../../core/services/diet.service';
import { InstallService } from '../../core/services/install.service';
import { PwaUpdateService } from '../../core/services/pwa-update.service';
import { OverlayHistoryService } from '../../core/services/overlay-history.service';

export type LifestyleModule = 'diet' | 'gym';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeaderComponent, DietPreferenceModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  readonly auth = inject(AuthService);
  readonly dietService = inject(DietService);
  readonly installService = inject(InstallService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pwaUpdate = inject(PwaUpdateService);
  private readonly overlayHistory = inject(OverlayHistoryService);

  readonly isDietModalOpen = signal<boolean>(false);
  readonly now = signal<Date>(new Date());

  constructor() {
    if (typeof document !== 'undefined') {
      const onVisChange = (): void => {
        if (document.visibilityState === 'visible') {
          this.now.set(new Date());
          this.auth.flushPendingDietSync();
        }
      };
      document.addEventListener('visibilitychange', onVisChange);
      this.destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', onVisChange));
    }
  }

  // Dynamic contextual greetings recomputed on resume
  readonly timeGreeting = computed(() => {
    const hour = this.now().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  readonly formattedDate = computed(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return this.now().toLocaleDateString('en-US', options);
  });

  onCardClick(module: LifestyleModule): void {
    if (module === 'diet') {
      this.router.navigate(['/diet']);
    }
  }

  openDietModal(): void {
    this.isDietModalOpen.set(true);
    this.overlayHistory.pushOverlay('home-diet-modal', () => {
      this.isDietModalOpen.set(false);
      this.pwaUpdate.notifyOverlayClosed();
    });
  }

  closeDietModal(): void {
    this.overlayHistory.popOverlay('home-diet-modal');
    this.isDietModalOpen.set(false);
    this.pwaUpdate.notifyOverlayClosed();
  }

  onDietPreferenceSaved(): void {
    this.overlayHistory.popOverlay('home-diet-modal');
    this.isDietModalOpen.set(false);
    this.pwaUpdate.notifyOverlayClosed();
    this.router.navigate(['/diet']);
  }
}
