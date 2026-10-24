import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthComponent } from './auth.component';
import { AuthService } from '../../core/services/auth.service';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let authService: AuthService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    fixture.detectChanges();
  });

  it('should create AuthComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should default to signin mode', () => {
    expect(component.mode()).toBe('signin');
  });

  it('should toggle between signin and signup modes', () => {
    component.toggleMode('signup');
    expect(component.mode()).toBe('signup');

    component.toggleMode('signin');
    expect(component.mode()).toBe('signin');
  });

  it('should toggle password visibility flag', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(false);
  });

  it('should fail validation if email is invalid', async () => {
    component.email = 'invalid-email';
    component.password = '123456';
    await component.handleSubmit();
    expect(component.validationError()).toContain('valid email');
  });

  it('should fail validation if password is too short', async () => {
    component.email = 'valid@example.com';
    component.password = '123';
    await component.handleSubmit();
    expect(component.validationError()).toContain('at least 6 characters');
  });

  it('should fail validation on signup if passwords do not match', async () => {
    component.toggleMode('signup');
    component.name = 'Alex';
    component.email = 'alex@example.com';
    component.password = 'secret123';
    component.confirmPassword = 'differentPassword';
    await component.handleSubmit();
    expect(component.validationError()).toContain('Passwords do not match');
  });
});
