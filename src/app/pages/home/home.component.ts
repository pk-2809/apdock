import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { DietPreferenceModalComponent } from '../../components/diet-preference-modal/diet-preference-modal.component';
import { AuthService } from '../../core/services/auth.service';
import { DietService } from '../../core/services/diet.service';

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
  private readonly router = inject(Router);

  readonly isDietModalOpen = signal<boolean>(false);

  // Dynamic contextual greetings
  readonly timeGreeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });

  readonly formattedDate = computed(() => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  });

  onCardClick(module: LifestyleModule): void {
    if (module === 'diet') {
      this.router.navigate(['/diet']);
    }
  }

  closeDietModal(): void {
    this.isDietModalOpen.set(false);
  }

  onDietPreferenceSaved(): void {
    this.isDietModalOpen.set(false);
    this.router.navigate(['/diet']);
  }
}
