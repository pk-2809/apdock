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

  it('should return a valid current time slot and its context', () => {
    const validSlots = ['breakfast', 'lunch', 'snack', 'dinner'];
    const currentSlot = service.getCurrentTimeSlot();
    expect(validSlots).toContain(currentSlot);

    const context = service.getTimeSlotContext(currentSlot);
    expect(context.id).toBe(currentSlot);
    expect(context.title).toBeTruthy();
    expect(context.icon).toBeTruthy();
    expect(context.timingRange).toBeTruthy();
    expect(context.periodName).toBeTruthy();
  });

  it('should return recipes with instructions', () => {
    const recipes = service.getAdditionalRecipes('both', 'loss');
    expect(recipes.length).toBeGreaterThan(0);
    const hasInstructions = recipes.some(r => r.instructions && r.instructions.length > 0);
    expect(hasInstructions).toBe(true);
  });

  it('should add custom recipe and include it in getAdditionalRecipes', () => {
    const initialCount = service.getAdditionalRecipes('veg', 'loss').length;
    const added = service.addCustomRecipe({
      title: 'Tofu Palak Stir Fry',
      keyIngredients: ['Firm Tofu', 'Fresh Spinach (Palak)', 'Garlic Cloves'],
      dietType: 'veg'
    });

    expect(added.id).toContain('custom-ar-');
    expect(added.title).toBe('Tofu Palak Stir Fry');
    expect(added.keyIngredients).toEqual(['Firm Tofu', 'Fresh Spinach (Palak)', 'Garlic Cloves']);

    const afterList = service.getAdditionalRecipes('veg', 'loss');
    expect(afterList.length).toBe(initialCount + 1);
    expect(afterList[0].title).toBe('Tofu Palak Stir Fry');
  });

  it('should update a recipe in the daily schedule via updateScheduleRecipe', () => {
    const day = 'Wednesday';
    const planBefore = service.getDayPlan(day, 'loss', 'veg');
    const targetMeal = planBefore.meals[0].primaryMeal;

    service.updateScheduleRecipe({
      id: targetMeal.id,
      name: 'Customized Morning Oats Bowl',
      veggies: ['Rolled Oats', 'Greek Yogurt', 'Blueberries'],
      day,
      slotId: 'breakfast',
      originalDay: day,
      originalSlotId: 'breakfast'
    });

    const planAfter = service.getDayPlan(day, 'loss', 'veg');
    const breakfastSlot = planAfter.meals.find(m => m.slotId === 'breakfast');
    const updated = [breakfastSlot!.primaryMeal, ...breakfastSlot!.alternativeOptions].find(m => m.id === targetMeal.id);

    expect(updated).toBeDefined();
    expect(updated?.name).toBe('Customized Morning Oats Bowl');
    expect(updated?.veggies).toEqual(['Rolled Oats', 'Greek Yogurt', 'Blueberries']);
  });

  it('should remove recipe from schedule and automatically add it to Additional Recipes', () => {
    const day = 'Wednesday';
    const planBefore = service.getDayPlan(day, 'loss', 'veg');
    const targetMeal = planBefore.meals[1].primaryMeal; // lunch meal

    const initialAdditionalCount = service.getAdditionalRecipes('veg', 'loss').length;

    // Remove from schedule
    const archivedRecipe = service.removeRecipeFromSchedule(targetMeal, day, 'lunch');

    // 1. Verify it was returned as an AdditionalRecipe
    expect(archivedRecipe).toBeDefined();
    expect(archivedRecipe.title).toBe(targetMeal.name);

    // 2. Verify it is now present in Additional Recipes
    const additionalAfter = service.getAdditionalRecipes('veg', 'loss');
    expect(additionalAfter.length).toBe(initialAdditionalCount + 1);
    expect(additionalAfter.some(r => r.title === targetMeal.name)).toBe(true);

    // 3. Verify it is removed from the daily schedule plan
    const planAfter = service.getDayPlan(day, 'loss', 'veg');
    const lunchSlot = planAfter.meals.find(m => m.slotId === 'lunch');
    const allOptions = [lunchSlot!.primaryMeal, ...lunchSlot!.alternativeOptions];
    expect(allOptions.some(m => m.id === targetMeal.id)).toBe(false);
  });

  it('should move an additional recipe to schedule and remove from Additional Recipes', () => {
    const additional = service.getAdditionalRecipes('veg', 'loss');
    const targetRecipe = additional[0];
    const initialAdditionalCount = additional.length;

    const createdMeals = service.moveAdditionalRecipeToSchedule({
      recipe: targetRecipe,
      slotId: 'dinner',
      day: 'Monday',
      applyToAllDays: false
    });

    expect(createdMeals.length).toBe(1);
    expect(createdMeals[0].name).toBe(targetRecipe.title);
    expect(createdMeals[0].slotId).toBe('dinner');
    expect(createdMeals[0].day).toBe('Monday');

    // Should now be removed from Additional Recipes
    const additionalAfter = service.getAdditionalRecipes('veg', 'loss');
    expect(additionalAfter.some(r => r.id === targetRecipe.id)).toBe(false);
    expect(additionalAfter.length).toBe(initialAdditionalCount - 1);

    // Verify it is in the Monday dinner plan
    const plan = service.getDayPlan('Monday', 'loss', 'veg');
    const dinnerSlot = plan.meals.find(m => m.slotId === 'dinner');
    const dinnerOptions = [dinnerSlot!.primaryMeal, ...dinnerSlot!.alternativeOptions];
    expect(dinnerOptions.some(m => m.name === targetRecipe.title)).toBe(true);
  });

  it('should move an additional recipe to schedule for all days when applyToAllDays is true', () => {
    const additional = service.getAdditionalRecipes('veg', 'loss');
    const targetRecipe = additional[0];

    const createdMeals = service.moveAdditionalRecipeToSchedule({
      recipe: targetRecipe,
      slotId: 'breakfast',
      day: 'Monday',
      applyToAllDays: true
    });

    expect(createdMeals.length).toBe(7);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    days.forEach(d => {
      const plan = service.getDayPlan(d as any, 'loss', 'veg');
      const breakfastSlot = plan.meals.find(m => m.slotId === 'breakfast');
      const options = [breakfastSlot!.primaryMeal, ...breakfastSlot!.alternativeOptions];
      expect(options.some(m => m.name === targetRecipe.title)).toBe(true);
    });
  });

  it('should update a custom additional recipe via updateAdditionalRecipe', () => {
    const added = service.addCustomRecipe({
      title: 'Original Smoothie',
      keyIngredients: ['Spinach', 'Banana'],
      dietType: 'veg'
    });

    const updated = service.updateAdditionalRecipe({
      id: added.id,
      title: 'Super Green Smoothie',
      keyIngredients: ['Spinach', 'Banana', 'Chia Seeds'],
      dietType: 'veg',
      category: 'Smoothie & Detox'
    });

    expect(updated.title).toBe('Super Green Smoothie');
    expect(updated.keyIngredients).toEqual(['Spinach', 'Banana', 'Chia Seeds']);

    const currentList = service.getAdditionalRecipes('veg', 'loss');
    const found = currentList.find(r => r.id === added.id);
    expect(found?.title).toBe('Super Green Smoothie');
    expect(found?.keyIngredients).toEqual(['Spinach', 'Banana', 'Chia Seeds']);
  });

  it('should update a default additional recipe via updateAdditionalRecipe', () => {
    const defaultRecipe = service.getAdditionalRecipes('veg', 'loss')[0];

    const updated = service.updateAdditionalRecipe({
      id: defaultRecipe.id,
      title: 'Renamed Default Recipe',
      keyIngredients: ['Kale', 'Cucumber'],
      dietType: 'veg'
    });

    expect(updated.title).toBe('Renamed Default Recipe');

    const currentList = service.getAdditionalRecipes('veg', 'loss');
    const found = currentList.find(r => r.id === defaultRecipe.id);
    expect(found?.title).toBe('Renamed Default Recipe');
    expect(found?.keyIngredients).toEqual(['Kale', 'Cucumber']);
  });

  it('should delete an additional recipe via removeAdditionalRecipe', () => {
    const defaultRecipe = service.getAdditionalRecipes('veg', 'loss')[0];
    const initialCount = service.getAdditionalRecipes('veg', 'loss').length;

    service.removeAdditionalRecipe(defaultRecipe.id);

    const currentList = service.getAdditionalRecipes('veg', 'loss');
    expect(currentList.length).toBe(initialCount - 1);
    expect(currentList.some(r => r.id === defaultRecipe.id)).toBe(false);
  });
});

