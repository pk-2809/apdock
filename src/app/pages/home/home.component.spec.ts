import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { HomeComponent } from './home.component';
import { AuthService } from '../../core/services/auth.service';
import { DietService } from '../../core/services/diet.service';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let authService: AuthService;
  let dietService: DietService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    dietService = TestBed.inject(DietService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture.detectChanges();
  });

  it('should create HomeComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should display the user display name in the greeting', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const greeting = compiled.querySelector('#welcomeHeading');
    expect(greeting).toBeTruthy();
    expect(greeting?.textContent).toContain(authService.userDisplayName());
  });

  it('should render square cards grid with both Diet Plan and Gym Schedule cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const grid = compiled.querySelector('.cards-grid');
    const dietCard = compiled.querySelector('#dietPlanCard');
    const gymCard = compiled.querySelector('#gymScheduleCard');

    expect(grid).toBeTruthy();
    expect(dietCard).toBeTruthy();
    expect(gymCard).toBeTruthy();
    expect(dietCard?.classList).toContain('square-card');
    expect(gymCard?.classList).toContain('square-card');
    expect(dietCard?.textContent).toContain('Diet Plan');
    expect(gymCard?.textContent).toContain('Gym Schedule');
  });

  it('should not contain tablist roles or active UI', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const tablist = compiled.querySelector('[role="tablist"]');
    const activeElements = compiled.querySelectorAll('.active');

    expect(tablist).toBeFalsy();
    expect(activeElements.length).toBe(0);
  });

  it('should call onCardClick when a square card is clicked', () => {
    const clickSpy = vi.spyOn(component, 'onCardClick');
    const compiled = fixture.nativeElement as HTMLElement;
    const dietCard = compiled.querySelector('#dietPlanCard') as HTMLButtonElement;
    const gymCard = compiled.querySelector('#gymScheduleCard') as HTMLButtonElement;

    dietCard.click();
    expect(clickSpy).toHaveBeenCalledWith('diet');

    gymCard.click();
    expect(clickSpy).toHaveBeenCalledWith('gym');
  });

  it('should navigate directly to /diet on clicking diet card', () => {
    const navSpy = vi.spyOn(router, 'navigate');

    component.onCardClick('diet');
    expect(navSpy).toHaveBeenCalledWith(['/diet']);
  });

  it('should navigate to /diet and close modal onDietPreferenceSaved', () => {
    component.isDietModalOpen.set(true);
    const navSpy = vi.spyOn(router, 'navigate');

    component.onDietPreferenceSaved();
    expect(component.isDietModalOpen()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/diet']);
  });

  it('should have millisecond staggered animation classes on the module cards', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const dietCard = compiled.querySelector('#dietPlanCard');
    const gymCard = compiled.querySelector('#gymScheduleCard');

    expect(dietCard?.classList).toContain('anim-stack-1');
    expect(gymCard?.classList).toContain('anim-stack-2');
  });

  it('should compute timeGreeting and formattedDate properly', () => {
    expect(component.timeGreeting()).toBeTruthy();
    expect(component.formattedDate()).toBeTruthy();
  });
});
