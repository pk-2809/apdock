import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { ThemeService, ThemeMode } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SplashScreenComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly auth = inject(AuthService);
  readonly pwaUpdate = inject(PwaUpdateService);
  private readonly themeService = inject(ThemeService);

  readonly showSplash = signal<boolean>(true);
  readonly currentTheme = this.themeService.currentTheme;

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }

  onSplashFinished(): void {
    this.showSplash.set(false);
  }

  triggerSplash(): void {
    this.showSplash.set(true);
  }
}
