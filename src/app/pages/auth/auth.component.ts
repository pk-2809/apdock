import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  readonly auth = inject(AuthService);

  // Mode: 'signin' | 'signup'
  readonly mode = signal<'signin' | 'signup'>('signin');

  // Form Model
  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  // UI state
  showPassword = signal<boolean>(false);
  validationError = signal<string | null>(null);

  toggleMode(newMode: 'signin' | 'signup'): void {
    this.mode.set(newMode);
    this.validationError.set(null);
    this.auth.authError.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((prev) => !prev);
  }

  async handleSubmit(): Promise<void> {
    this.validationError.set(null);

    // Basic Validation
    if (!this.email || !this.email.includes('@')) {
      this.validationError.set('Please enter a valid email address.');
      return;
    }

    if (!this.password || this.password.length < 6) {
      this.validationError.set('Password must be at least 6 characters.');
      return;
    }

    if (this.mode() === 'signup') {
      if (!this.name.trim()) {
        this.validationError.set('Please provide your name to personalize your dock.');
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.validationError.set('Passwords do not match. Please check again.');
        return;
      }
    }

    try {
      if (this.mode() === 'signup') {
        await this.auth.signUp(this.email, this.password, this.name);
      } else {
        await this.auth.signIn(this.email, this.password);
      }
    } catch {
      // Error already surfaced in auth.authError
    }
  }

  async handleGoogleSignIn(): Promise<void> {
    this.validationError.set(null);
    try {
      await this.auth.signInWithGoogle();
    } catch {
      // Handled in auth.authError
    }
  }

  async handleSignOut(): Promise<void> {
    await this.auth.signOut();
  }
}
