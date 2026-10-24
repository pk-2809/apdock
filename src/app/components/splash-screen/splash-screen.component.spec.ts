import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SplashScreenComponent } from './splash-screen.component';
import { vi } from 'vitest';

describe('SplashScreenComponent', () => {
  let component: SplashScreenComponent;
  let fixture: ComponentFixture<SplashScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SplashScreenComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SplashScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the cute minimal splash screen', () => {
    expect(component).toBeTruthy();
  });

  it('should render the brand title and cute logo image', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.cute-title')?.textContent).toContain('apdock');
    expect(compiled.querySelector('.cute-logo-img')).toBeTruthy();
  });

  it('should render 4 cute dancing quadrant dots matching logo theme', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const dots = compiled.querySelectorAll('.cute-dot');
    expect(dots.length).toBe(4);
    expect(compiled.querySelector('.dot-amber')).toBeTruthy();
    expect(compiled.querySelector('.dot-emerald')).toBeTruthy();
    expect(compiled.querySelector('.dot-violet')).toBeTruthy();
    expect(compiled.querySelector('.dot-coral')).toBeTruthy();
  });

  it('should dismiss automatically or on demand with exit transition', async () => {
    vi.useFakeTimers();
    let emitted = false;
    component.finished.subscribe(() => {
      emitted = true;
    });

    component.dismiss();
    expect(component.isLeaving()).toBe(true);

    vi.advanceTimersByTime(450);
    expect(emitted).toBe(true);
    vi.useRealTimers();
  });
});
