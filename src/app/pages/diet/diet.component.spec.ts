import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { DietComponent } from './diet.component';
import { DietService } from '../../core/services/diet.service';
import { AuthService } from '../../core/services/auth.service';

describe('DietComponent', () => {
  let component: DietComponent;
  let fixture: ComponentFixture<DietComponent>;
  let router: Router;
  let dietService: DietService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [DietComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(DietComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    dietService = TestBed.inject(DietService);
    fixture.detectChanges();
  });

  it('should create DietComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to /home when goBack is called', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goBack();
    expect(navSpy).toHaveBeenCalledWith(['/home']);
  });

  it('should auto-pick current day and current time slot', () => {
    expect(component.selectedDay()).toBe(dietService.getCurrentDayName());
    expect(component.currentTimeSlot()).toBe(dietService.getCurrentTimeSlot());
    expect(component.resolvedSlotId()).toBe(component.currentTimeSlot());
  });

  it('should update selected day when selectDay is called', async () => {
    await component.selectDay('Monday');
    expect(component.selectedDay()).toBe('Monday');
    expect(component.dayPlan().day).toBe('Monday');
  });

  it('should maintain a circular queue where Monday always follows Sunday and Sunday precedes Monday', () => {
    const days = component.circularDays();
    expect(days.length).toBe(35); // 5 cycles of 7 days

    // Verify every Sunday (except the very last item) is followed directly by Monday
    // and every Monday (except the very first item) is preceded directly by Sunday
    days.forEach((item, index) => {
      if (item.name === 'Sunday' && index < days.length - 1) {
        expect(days[index + 1].name).toBe('Monday');
      }
      if (item.name === 'Monday' && index > 0) {
        expect(days[index - 1].name).toBe('Sunday');
      }
    });
  });

  it('should update selectedGlobalIndex when selectCircularDay is called', async () => {
    const mondayItem = component.circularDays().find(d => d.cycleIndex === 1 && d.name === 'Monday');
    expect(mondayItem).toBeDefined();
    if (mondayItem) {
      await component.selectCircularDay(mondayItem);
      expect(component.selectedGlobalIndex()).toBe(mondayItem.globalIndex);
      expect(component.selectedDay()).toBe('Monday');
      expect(component.dayPlan().day).toBe('Monday');
    }
  });

  it('should shift slightly by 1 chip when switching between adjacent days', async () => {
    // Select Sunday
    await component.selectDay('Sunday');
    const sundayIndex = component.selectedGlobalIndex();

    // Changing to Saturday should shift 1 chip to the left (-1)
    await component.selectDay('Saturday');
    expect(component.selectedGlobalIndex()).toBe(sundayIndex - 1);
    expect(component.selectedDay()).toBe('Saturday');

    // Changing back to Sunday should shift 1 chip to the right (+1)
    await component.selectDay('Sunday');
    expect(component.selectedGlobalIndex()).toBe(sundayIndex);

    // Changing to Monday should shift 1 chip to the right (+1)
    await component.selectDay('Monday');
    expect(component.selectedGlobalIndex()).toBe(sundayIndex + 1);
    expect(component.selectedDay()).toBe('Monday');
  });

  it('should provide read-only slotOptions for active meal without heavy selection requirement', () => {
    const options = component.slotOptions();
    expect(options.length).toBeGreaterThan(0);
    expect(options[0].name).toBeTruthy();
    expect(options[0].prepTimeMinutes).toBeGreaterThan(0);
  });

  it('should filter meal slots when setSlotFilter is called', () => {
    component.setSlotFilter('breakfast');
    expect(component.activeSlotFilter()).toBe('breakfast');
    expect(component.activeMealSlot().slotId).toBe('breakfast');

    component.setSlotFilter('lunch');
    expect(component.activeSlotFilter()).toBe('lunch');
    expect(component.activeMealSlot().slotId).toBe('lunch');

    component.setSlotFilter('dinner');
    expect(component.activeSlotFilter()).toBe('dinner');
    expect(component.activeMealSlot().slotId).toBe('dinner');
  });

  it('should allow swapping meal options for a slot', () => {
    const slot = component.dayPlan().meals[0];
    const initialMeal = component.getActiveMeal(slot);
    expect(initialMeal.id).toBe(slot.primaryMeal.id);

    if (slot.alternativeOptions.length > 0) {
      const altId = slot.alternativeOptions[0].id;
      component.selectMealOption(slot.slotId, altId);
      const updatedMeal = component.getActiveMeal(slot);
      expect(updatedMeal.id).toBe(altId);
    }
  });

  it('should toggle vegetable checked status', () => {
    const veggies = component.displayedVeggies();
    expect(veggies.length).toBeGreaterThan(0);
    const firstVeg = veggies[0].name;

    expect(component.checkedVeggies().includes(firstVeg)).toBe(false);
    component.toggleVeggie(firstVeg);
    expect(component.checkedVeggies().includes(firstVeg)).toBe(true);

    component.toggleVeggie(firstVeg);
    expect(component.checkedVeggies().includes(firstVeg)).toBe(false);
  });

  it('should show all additional recipes without category filtering', () => {
    const initialAll = component.additionalRecipes();
    expect(initialAll.length).toBeGreaterThan(0);

    component.setRecipeCategory('High Protein');
    expect(component.selectedRecipeCategory()).toBe('High Protein');
    expect(component.additionalRecipes().length).toBe(initialAll.length);

    component.setRecipeCategory('All');
    expect(component.additionalRecipes().length).toBe(initialAll.length);
  });

  it('should open and close the recipe details modal', () => {
    const recipe = component.additionalRecipes()[0];
    expect(component.activeRecipeModal()).toBeNull();

    component.openRecipeModal(recipe);
    expect(component.activeRecipeModal()).toBe(recipe);

    component.closeRecipeModal();
    expect(component.activeRecipeModal()).toBeNull();
  });

  it('should open and close the diet preferences modal', () => {
    // When no preference exists on init, it auto-opens
    expect(component.isDietModalOpen()).toBe(true);

    component.closeDietModal();
    expect(component.isDietModalOpen()).toBe(false);

    component.openDietModal();
    expect(component.isDietModalOpen()).toBe(true);
  });

  it('should open and close the add recipe modal', () => {
    expect(component.isAddRecipeModalOpen()).toBe(false);

    component.openAddRecipeModal();
    expect(component.isAddRecipeModalOpen()).toBe(true);

    component.closeAddRecipeModal();
    expect(component.isAddRecipeModalOpen()).toBe(false);
  });

  it('should reflect newly added custom recipe in additionalRecipes list', () => {
    const initialCount = component.additionalRecipes().length;

    component.dietService.addCustomRecipe({
      title: 'Spiced Avocado Toast',
      keyIngredients: ['Sourdough Bread', 'Ripe Avocado', 'Chilli Flakes'],
      dietType: 'veg'
    });

    component.onRecipeAdded({
      destination: 'additional',
      title: 'Spiced Avocado Toast',
      keyIngredients: ['Sourdough Bread', 'Ripe Avocado', 'Chilli Flakes'],
      dietType: 'veg',
      mealSlot: 'breakfast',
      day: 'Monday'
    });

    const updatedRecipes = component.additionalRecipes();
    expect(updatedRecipes.length).toBe(initialCount + 1);
    expect(updatedRecipes.some(r => r.title === 'Spiced Avocado Toast')).toBe(true);
  });

  it('should reflect newly added recipe in Day Meal slot options', () => {
    component.activeSlotFilter.set('lunch');
    const day = component.selectedDay();

    component.dietService.addCustomDayMeal({
      day,
      slotId: 'lunch',
      name: 'Paneer Tikka Salad',
      veggies: ['Paneer (Cottage Cheese)', 'Red Bell Peppers']
    });

    component.onRecipeAdded({
      destination: 'day_meal',
      title: 'Paneer Tikka Salad',
      keyIngredients: ['Paneer (Cottage Cheese)', 'Red Bell Peppers'],
      dietType: 'veg',
      mealSlot: 'lunch',
      day
    });

    const options = component.slotOptions();
    expect(options.some(o => o.name === 'Paneer Tikka Salad')).toBe(true);
  });

  it('should open edit schedule recipe modal with correct state', () => {
    const dish = component.slotOptions()[0];
    component.openEditScheduleRecipeModal(dish);

    expect(component.modalMode()).toBe('edit');
    expect(component.editingMeal()).toEqual(dish);
    expect(component.isAddRecipeModalOpen()).toBe(true);
  });

  it('should handle onRecipeUpdated by refreshing plan and showing toast', () => {
    const dish = component.slotOptions()[0];
    component.openEditScheduleRecipeModal(dish);

    const updateEvent = {
      id: dish.id,
      name: 'Super High Protein Scramble',
      veggies: ['Eggs', 'Spinach'],
      day: component.selectedDay(),
      slotId: component.activeSlotFilter()
    };

    component.onRecipeUpdated(updateEvent);

    expect(component.isAddRecipeModalOpen()).toBe(false);
    expect(component.toastMessage()).toContain('Super High Protein Scramble');
  });

  it('should remove recipe from schedule and automatically add to additional recipes', () => {
    const dish = component.slotOptions()[0];
    const initialAdditionalCount = component.additionalRecipes().length;

    component.removeRecipeFromSchedule(dish);

    // 1. Dish should no longer be present in slotOptions
    const optionsAfter = component.slotOptions();
    expect(optionsAfter.some(o => o.id === dish.id)).toBe(false);

    // 2. Dish should automatically be added to additionalRecipes
    const additionalAfter = component.additionalRecipes();
    expect(additionalAfter.length).toBe(initialAdditionalCount + 1);
    expect(additionalAfter.some(r => r.title === dish.name)).toBe(true);

    // 3. User feedback toast should be displayed
    expect(component.toastMessage()).toContain('moved to Additional Recipes');
  });

  it('should move an additional recipe to schedule via onRecipeMovedToSchedule', () => {
    const additional = component.additionalRecipes();
    const recipeToMove = additional[0];
    const initialAdditionalCount = additional.length;

    component.openRecipeModal(recipeToMove);
    expect(component.activeRecipeModal()).toBe(recipeToMove);

    component.onRecipeMovedToSchedule({
      recipe: recipeToMove,
      slotId: 'lunch',
      applyToAllDays: false
    });

    // 1. Modal should be closed
    expect(component.activeRecipeModal()).toBeNull();

    // 2. Recipe should be removed from additional recipes
    expect(component.additionalRecipes().length).toBe(initialAdditionalCount - 1);
    expect(component.additionalRecipes().some(r => r.id === recipeToMove.id)).toBe(false);

    // 3. Active slot should now be lunch and recipe should appear in slotOptions
    expect(component.activeSlotFilter()).toBe('lunch');
    expect(component.slotOptions().some(o => o.name === recipeToMove.title)).toBe(true);

    // 4. Toast notification should confirm movement
    expect(component.toastMessage()).toContain(recipeToMove.title);
  });

  it('should open edit modal for additional recipe via openEditAdditionalRecipeModal', () => {
    const additional = component.additionalRecipes();
    const recipe = additional[0];

    component.openRecipeModal(recipe);
    expect(component.activeRecipeModal()).toBe(recipe);

    component.openEditAdditionalRecipeModal(recipe);

    expect(component.activeRecipeModal()).toBeNull();
    expect(component.isAddRecipeModalOpen()).toBe(true);
    expect(component.modalMode()).toBe('edit');
    expect(component.editingAdditionalRecipe()).toBe(recipe);
    expect(component.addRecipeModalTarget()).toBe('additional');
  });

  it('should handle onAdditionalRecipeUpdated and onAdditionalRecipeDeleted with toasts', () => {
    const additional = component.additionalRecipes();
    const recipe = additional[0];

    component.openEditAdditionalRecipeModal(recipe);

    component.onAdditionalRecipeUpdated({ ...recipe, title: 'Super Bowl' });
    expect(component.isAddRecipeModalOpen()).toBe(false);
    expect(component.toastMessage()).toContain('Super Bowl');

    component.onAdditionalRecipeDeleted(recipe);
    expect(component.toastMessage()).toContain(recipe.title);
  });
});
