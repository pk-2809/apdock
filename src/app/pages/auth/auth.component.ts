import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);

  // Mode: 'signin' | 'signup'
  readonly mode = signal<'signin' | 'signup'>('signin');

  // Form Fields
  // Sign In: username + pin
  username = '';
  pin = '';

  // Sign Up: name + email + pin + confirmPin
  name = '';
  email = '';
  confirmPin = '';

  // UI state
  showPin = signal<boolean>(false);
  showConfirmPin = signal<boolean>(false);
  validationError = signal<string | null>(null);

  toggleMode(newMode: 'signin' | 'signup'): void {
    this.mode.set(newMode);
    this.validationError.set(null);
    this.auth.authError.set(null);
  }

  togglePinVisibility(): void {
    this.showPin.update((prev) => !prev);
  }

  toggleConfirmPinVisibility(): void {
    this.showConfirmPin.update((prev) => !prev);
  }

  onPinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 4);
    this.pin = digitsOnly;
    input.value = digitsOnly;
  }

  onConfirmPinInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 4);
    this.confirmPin = digitsOnly;
    input.value = digitsOnly;
  }

  async handleSubmit(): Promise<void> {
    this.validationError.set(null);
    this.auth.authError.set(null);

    if (this.mode() === 'signin') {
      const cleanUser = this.username.trim();
      if (!cleanUser) {
        this.validationError.set('Please enter your username to sign in.');
        return;
      }

      if (!/^\d{4}$/.test(this.pin)) {
        this.validationError.set('PIN must be exactly 4 digits.');
        return;
      }

      try {
        await this.auth.signInWithUsernameAndPin(cleanUser, this.pin);
        await this.router.navigate(['/home']);
      } catch {
        // Error is surfaced in auth.authError signal
      }
    } else {
      // Sign Up validation
      const cleanName = this.name.trim();
      if (!cleanName) {
        this.validationError.set('Please provide your name to personalize your space.');
        return;
      }

      const cleanEmail = this.email.trim();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        this.validationError.set('Please enter a valid email address.');
        return;
      }

      if (!/^\d{4}$/.test(this.pin)) {
        this.validationError.set('PIN must be exactly 4 digits.');
        return;
      }

      if (this.pin !== this.confirmPin) {
        this.validationError.set('PINs do not match. Please re-enter.');
        return;
      }

      try {
        await this.auth.signUpWithNameEmailPin(cleanName, cleanEmail, this.pin);
        await this.router.navigate(['/home']);
      } catch {
        // Error is surfaced in auth.authError signal
      }
    }
  }
}
