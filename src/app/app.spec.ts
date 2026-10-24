import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should have DockAppService and HapticService injected', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.dock).toBeTruthy();
    expect(app.haptics).toBeTruthy();
  });
});
