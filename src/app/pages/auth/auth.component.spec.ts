import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthComponent } from './auth.component';
import { AuthService } from '../../core/services/auth.service';

describe('AuthComponent', () => {
  let component: AuthComponent;
  let fixture: ComponentFixture<AuthComponent>;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
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

  it('should toggle PIN visibility flags', () => {
    expect(component.showPin()).toBe(false);
    component.togglePinVisibility();
    expect(component.showPin()).toBe(true);
    component.togglePinVisibility();
    expect(component.showPin()).toBe(false);

    expect(component.showConfirmPin()).toBe(false);
    component.toggleConfirmPinVisibility();
    expect(component.showConfirmPin()).toBe(true);
  });

  it('should sanitize PIN input to max 4 digits and reject letters', () => {
    const inputElem = document.createElement('input');
    inputElem.value = '12ab345';
    const event = { target: inputElem } as unknown as Event;

    component.onPinInput(event);
    expect(component.pin).toBe('1234');
    expect(inputElem.value).toBe('1234');
  });

  it('should fail signin validation if username is missing', async () => {
    component.username = '';
    component.pin = '1234';
    await component.handleSubmit();
    expect(component.validationError()).toContain('enter your username');
  });

  it('should fail signin validation if PIN is not exactly 4 digits', async () => {
    component.username = 'alex';
    component.pin = '12';
    await component.handleSubmit();
    expect(component.validationError()).toContain('exactly 4 digits');

    component.pin = '12345';
    await component.handleSubmit();
    expect(component.validationError()).toContain('exactly 4 digits');
  });

  it('should call signInWithUsernameAndPin and navigate to /home on valid signin input', async () => {
    const spy = vi.spyOn(authService, 'signInWithUsernameAndPin').mockResolvedValue({} as any);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.username = 'alex';
    component.pin = '1234';
    await component.handleSubmit();
    expect(spy).toHaveBeenCalledWith('alex', '1234');
    expect(navSpy).toHaveBeenCalledWith(['/home']);
  });

  it('should fail signup validation if name is empty', async () => {
    component.toggleMode('signup');
    component.name = '';
    component.email = 'alex@example.com';
    component.pin = '1234';
    component.confirmPin = '1234';
    await component.handleSubmit();
    expect(component.validationError()).toContain('provide your name');
  });

  it('should fail signup validation if email is invalid', async () => {
    component.toggleMode('signup');
    component.name = 'Alex';
    component.email = 'not-an-email';
    component.pin = '1234';
    component.confirmPin = '1234';
    await component.handleSubmit();
    expect(component.validationError()).toContain('valid email');
  });

  it('should fail signup validation if PIN is not exactly 4 digits', async () => {
    component.toggleMode('signup');
    component.name = 'Alex';
    component.email = 'alex@example.com';
    component.pin = '123';
    component.confirmPin = '123';
    await component.handleSubmit();
    expect(component.validationError()).toContain('exactly 4 digits');
  });

  it('should fail signup validation if PINs do not match', async () => {
    component.toggleMode('signup');
    component.name = 'Alex';
    component.email = 'alex@example.com';
    component.pin = '1234';
    component.confirmPin = '9999';
    await component.handleSubmit();
    expect(component.validationError()).toContain('PINs do not match');
  });

  it('should call signUpWithNameEmailPin and navigate to /home on valid signup input', async () => {
    const spy = vi.spyOn(authService, 'signUpWithNameEmailPin').mockResolvedValue({} as any);
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    component.toggleMode('signup');
    component.name = 'Alex River';
    component.email = 'alex@example.com';
    component.pin = '5678';
    component.confirmPin = '5678';
    await component.handleSubmit();
    expect(spy).toHaveBeenCalledWith('Alex River', 'alex@example.com', '5678');
    expect(navSpy).toHaveBeenCalledWith(['/home']);
  });
});
