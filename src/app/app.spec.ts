import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, SplashScreenComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize with splash screen active and default theme', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.showSplash()).toBe(true);
    expect(app.currentTheme()).toBe('system');
  });

  it('should support switching between light and dark themes', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.setTheme('light');
    expect(app.currentTheme()).toBe('light');

    app.setTheme('dark');
    expect(app.currentTheme()).toBe('dark');
  });

  it('should hide splash screen when onSplashFinished is called', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.onSplashFinished();
    expect(app.showSplash()).toBe(false);
  });
});
