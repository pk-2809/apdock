import { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { HomeComponent } from './pages/home/home.component';
import { DietComponent } from './pages/diet/diet.component';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'diet', component: DietComponent, canActivate: [authGuard] },
  { path: 'auth', component: AuthComponent, canActivate: [guestGuard] },
  { path: '**', redirectTo: 'home' }
];
