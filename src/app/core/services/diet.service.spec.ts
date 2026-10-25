import { TestBed } from '@angular/core/testing';
import { DietService } from './diet.service';
import { AuthService } from './auth.service';

describe('DietService', () => {
  let service: DietService;
  let authService: AuthService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DietService);
    authService = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should detect when user has no preference', () => {
    expect(service.hasPreference()).toBe(false);
  });

  it('should save preference and sync to backend and localStorage', async () => {
    const authSpy = vi.spyOn(authService, 'updateDietPreference').mockResolvedValue();

    await service.savePreference('loss', 'both');

    expect(service.hasPreference()).toBe(true);
    expect(service.preference()?.goal).toBe('loss');
    expect(service.preference()?.dietType).toBe('both');
    expect(authSpy).toHaveBeenCalledWith({
      goal: 'loss',
      dietType: 'both',
      updatedAt: expect.any(String)
    });

    const stored = JSON.parse(localStorage.getItem('apdock_diet_preference') || '{}');
    expect(stored.goal).toBe('loss');
    expect(stored.dietType).toBe('both');
  });

  it('should reactively sync preference when auth userProfile updates from backend', () => {
    const backendPref = {
      goal: 'gain' as const,
      dietType: 'both' as const,
      updatedAt: '2026-10-25T10:00:00Z'
    };

    authService.userProfile.set({
      uid: 'test-user',
      username: 'test',
      email: 'test@example.com',
      displayName: 'Test User',
      dietPreference: backendPref
    } as any);

    TestBed.flushEffects();

    expect(service.preference()?.goal).toBe('gain');
    expect(service.preference()?.dietType).toBe('both');
  });

  it('should return a day plan for each day of the week', () => {
    const plan = service.getDayPlan('Wednesday', 'loss', 'both');
    expect(plan.day).toBe('Wednesday');
    expect(plan.meals.length).toBe(4);
    expect(plan.todayVeggies.length).toBeGreaterThan(0);
    expect(plan.totalCalories).toBeGreaterThan(0);
  });

  it('should provide additional recipes filtered by dietType or all for both', () => {
    const vegRecipes = service.getAdditionalRecipes('veg', 'loss');
    expect(vegRecipes.length).toBeGreaterThan(0);
    expect(vegRecipes.every(r => r.dietType === 'veg')).toBe(true);

    const nonvegRecipes = service.getAdditionalRecipes('nonveg', 'loss');
    expect(nonvegRecipes.length).toBeGreaterThan(0);

    const bothRecipes = service.getAdditionalRecipes('both', 'loss');
    expect(bothRecipes.length).toBeGreaterThanOrEqual(vegRecipes.length);
  });

  it('should return a valid day of week from getCurrentDayName', () => {
    const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = service.getCurrentDayName();
    expect(validDays).toContain(currentDay);
  });
});
