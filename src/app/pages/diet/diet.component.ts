import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';

@Component({
  selector: 'app-diet',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './diet.component.html',
  styleUrl: './diet.component.css'
})
export class DietComponent {
  private readonly router = inject(Router);

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
