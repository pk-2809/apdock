import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddRecipeModalComponent } from './add-recipe-modal.component';
import { DietService } from '../../core/services/diet.service';
import { provideRouter } from '@angular/router';

describe('AddRecipeModalComponent', () => {
  let component: AddRecipeModalComponent;
  let fixture: ComponentFixture<AddRecipeModalComponent>;
  let dietService: DietService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AddRecipeModalComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AddRecipeModalComponent);
    component = fixture.componentInstance;
    dietService = TestBed.inject(DietService);
    component.isOpen = true;
    fixture.detectChanges();
  });

  it('should create AddRecipeModalComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should filter ingredients based on searchQuery and exclude already selected items', () => {
    component.searchQuery.set('Spinach');
    const filtered = component.filteredIngredients();
    expect(filtered.some(i => i.includes('Spinach'))).toBe(true);

    // Select spinach
    component.selectIngredient(filtered[0]);
    expect(component.ingredients()).toContain(filtered[0]);
    // Search query should be reset to empty
    expect(component.searchQuery()).toBe('');

    // Spinach should not be in filtered list anymore
    component.searchQuery.set('Spinach');
    expect(component.filteredIngredients().some(i => i === filtered[0])).toBe(false);
  });

  it('should allow adding custom ingredients typed in search query', () => {
    component.searchQuery.set('Chia Pudding Base');
    const filtered = component.filteredIngredients();
    expect(filtered).toContain('Chia Pudding Base');

    component.selectIngredient('Chia Pudding Base');
    expect(component.ingredients()).toContain('Chia Pudding Base');
    expect(component.searchQuery()).toBe('');
  });

  it('should remove ingredient chip when removeIngredient is called', () => {
    component.selectIngredient('Red Tomatoes');
    component.selectIngredient('Cucumbers');
    expect(component.ingredients().length).toBe(2);

    component.removeIngredient('Red Tomatoes');
    expect(component.ingredients()).toEqual(['Cucumbers']);
  });

  it('should show error when submitting without recipe name', () => {
    component.recipeName.set('');
    component.selectIngredient('Red Tomatoes');

    component.submitRecipe();
    expect(component.errorMessage()).toContain('recipe name');
  });

  it('should show error when submitting without any ingredient', () => {
    component.recipeName.set('Delicious Salad');
    component.ingredients.set([]);

    component.submitRecipe();
    expect(component.errorMessage()).toContain('at least one ingredient');
  });

  it('should successfully add custom recipe to additional recipes, emit added event and close modal', () => {
    const addSpy = vi.spyOn(dietService, 'addCustomRecipe');
    const emitSpy = vi.spyOn(component.added, 'emit');
    const closeSpy = vi.spyOn(component.close, 'emit');

    component.destination.set('additional');
    component.recipeName.set('Paneer Bhurji Bowl');
    component.selectIngredient('Paneer (Cottage Cheese)');
    component.selectIngredient('Red Tomatoes');
    component.selectIngredient('Onions');
    component.setDietType('veg');

    component.submitRecipe();

    expect(addSpy).toHaveBeenCalledWith({
      title: 'Paneer Bhurji Bowl',
      keyIngredients: ['Paneer (Cottage Cheese)', 'Red Tomatoes', 'Onions'],
      category: 'High Protein',
      dietType: 'veg'
    });
    expect(emitSpy).toHaveBeenCalled();
    expect(closeSpy).toHaveBeenCalled();
    expect(component.recipeName()).toBe('');
    expect(component.ingredients()).toEqual([]);
  });

  it('should successfully add to day meal and call addCustomDayMeal', () => {
    const addMealSpy = vi.spyOn(dietService, 'addCustomDayMeal');
    const emitSpy = vi.spyOn(component.added, 'emit');

    component.destination.set('day_meal');
    component.setMealSlot('breakfast');
    component.setTargetDay('Friday');
    component.recipeName.set('Oats Omelette');
    component.selectIngredient('Rolled Oats');
    component.selectIngredient('Whole Eggs');

    component.submitRecipe();

    expect(addMealSpy).toHaveBeenCalledWith({
      day: 'Friday',
      slotId: 'breakfast',
      name: 'Oats Omelette',
      veggies: ['Rolled Oats', 'Whole Eggs']
    });
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({
      destination: 'day_meal',
      title: 'Oats Omelette',
      mealSlot: 'breakfast',
      day: 'Friday'
    }));
  });

  it('should initialize form with existing meal details when mode is edit', () => {
    component.mode = 'edit';
    component.editingMeal = {
      id: 'meal-123',
      name: 'Paneer Bhurji with Peas',
      description: 'Fresh spiced cottage cheese with green peas',
      calories: 340,
      protein: 20,
      carbs: 12,
      fat: 14,
      prepTimeMinutes: 15,
      veggies: ['Paneer (Cottage Cheese)', 'Green Peas', 'Red Tomatoes']
    };
    component.initialSlot = 'lunch';
    component.activeDay = 'Tuesday';

    component.ngOnChanges();

    expect(component.recipeName()).toBe('Paneer Bhurji with Peas');
    expect(component.ingredients()).toEqual(['Paneer (Cottage Cheese)', 'Green Peas', 'Red Tomatoes']);
    expect(component.mealSlot()).toBe('lunch');
    expect(component.targetDay()).toBe('Tuesday');
  });

  it('should call updateScheduleRecipe and emit updated event when submitting in edit mode', () => {
    const updateSpy = vi.spyOn(dietService, 'updateScheduleRecipe');
    const updatedEmitSpy = vi.spyOn(component.updated, 'emit');
    const closeEmitSpy = vi.spyOn(component.close, 'emit');

    component.mode = 'edit';
    component.editingMeal = {
      id: 'meal-123',
      name: 'Original Paneer Dish',
      description: 'Original dish description',
      calories: 300,
      protein: 15,
      carbs: 20,
      fat: 10,
      prepTimeMinutes: 15,
      veggies: ['Paneer (Cottage Cheese)']
    };
    component.initialSlot = 'lunch';
    component.activeDay = 'Tuesday';
    component.ngOnChanges();

    // User edits the name and adds an ingredient
    component.recipeName.set('Updated Paneer Tikka Masala');
    component.selectIngredient('Red Bell Peppers');
    component.setMealSlot('dinner');
    component.setTargetDay('Wednesday');

    component.submitRecipe();

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: 'meal-123',
      name: 'Updated Paneer Tikka Masala',
      veggies: ['Paneer (Cottage Cheese)', 'Red Bell Peppers'],
      day: 'Wednesday',
      slotId: 'dinner',
      originalDay: 'Tuesday',
      originalSlotId: 'lunch'
    }));

    expect(updatedEmitSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: 'meal-123',
      name: 'Updated Paneer Tikka Masala'
    }));
    expect(closeEmitSpy).toHaveBeenCalled();
  });

  it('should emit removed event and close modal when onRemoveFromSchedule is called', () => {
    const removedEmitSpy = vi.spyOn(component.removed, 'emit');
    const closeEmitSpy = vi.spyOn(component.close, 'emit');

    const meal = {
      id: 'meal-123',
      name: 'Paneer Dish',
      description: 'Test dish',
      calories: 300,
      protein: 15,
      carbs: 20,
      fat: 10,
      prepTimeMinutes: 15,
      veggies: ['Paneer (Cottage Cheese)']
    };
    component.mode = 'edit';
    component.editingMeal = meal;

    component.onRemoveFromSchedule();

    expect(removedEmitSpy).toHaveBeenCalledWith(meal);
    expect(closeEmitSpy).toHaveBeenCalled();
  });

  it('should open confirmation popup on promptRemoveFromSchedule and cancel on cancelRemoveFromSchedule', () => {
    expect(component.isConfirmRemoveOpen()).toBe(false);
    component.promptRemoveFromSchedule();
    expect(component.isConfirmRemoveOpen()).toBe(true);

    component.cancelRemoveFromSchedule();
    expect(component.isConfirmRemoveOpen()).toBe(false);
  });

  it('should compute descriptive contextSubtitle for different modes and destinations', () => {
    component.mode = 'add';
    component.destination.set('day_meal');
    component.targetDay.set('Sunday');
    component.mealSlot.set('lunch');
    expect(component.contextSubtitle()).toBe('Adding to Sunday · Lunch');

    component.destination.set('additional');
    expect(component.contextSubtitle()).toBe('Adding to Additional Recipes');

    component.mode = 'edit';
    component.targetDay.set('Tuesday');
    component.mealSlot.set('dinner');
    expect(component.contextSubtitle()).toBe('Editing · Tuesday · Dinner');
  });

  it('should lock body scroll when open and unlock when closed or destroyed', () => {
    component.isOpen = true;
    component.ngOnChanges();
    expect(document.body.style.overflow).toBe('hidden');

    component.closeModal();
    expect(document.body.style.overflow).toBe('');

    component.isOpen = true;
    component.ngOnChanges();
    expect(document.body.style.overflow).toBe('hidden');

    component.ngOnDestroy();
    expect(document.body.style.overflow).toBe('');
  });

  it('should initialize form with additional recipe details and update via updateAdditionalRecipe', () => {
    const updateSpy = vi.spyOn(dietService, 'updateAdditionalRecipe');
    const updatedEmitSpy = vi.spyOn(component.updatedAdditional, 'emit');
    const closeEmitSpy = vi.spyOn(component.close, 'emit');

    component.mode = 'edit';
    component.editingAdditionalRecipe = {
      id: 'ar-custom-1',
      title: 'Green Monster Detox Smoothie',
      category: 'Smoothie & Detox',
      calories: 180,
      protein: 9,
      prepTime: '5 mins',
      dietType: 'veg',
      imageIcon: '🥤',
      description: 'Nutrient-rich power blend.',
      keyIngredients: ['Baby Spinach', 'Cucumber', 'Chia Seeds']
    };
    component.ngOnChanges();

    expect(component.recipeName()).toBe('Green Monster Detox Smoothie');
    expect(component.ingredients()).toEqual(['Baby Spinach', 'Cucumber', 'Chia Seeds']);
    expect(component.selectedDietType()).toBe('veg');
    expect(component.contextSubtitle()).toBe('Editing · Additional Recipes');

    component.recipeName.set('Updated Super Green Smoothie');
    component.submitRecipe();

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: 'ar-custom-1',
      title: 'Updated Super Green Smoothie',
      keyIngredients: ['Baby Spinach', 'Cucumber', 'Chia Seeds'],
      dietType: 'veg'
    }));
    expect(updatedEmitSpy).toHaveBeenCalled();
    expect(closeEmitSpy).toHaveBeenCalled();
  });

  it('should delete additional recipe when confirmed in remove dialog', () => {
    const removeSpy = vi.spyOn(dietService, 'removeAdditionalRecipe');
    const deletedEmitSpy = vi.spyOn(component.deletedAdditional, 'emit');
    const closeEmitSpy = vi.spyOn(component.close, 'emit');

    const recipe = {
      id: 'ar-custom-2',
      title: 'Berry Protein Bowl',
      category: 'High Protein' as const,
      calories: 220,
      protein: 15,
      prepTime: '5 mins',
      dietType: 'veg' as const,
      imageIcon: '🥣',
      description: 'Berry bowl',
      keyIngredients: ['Greek Yogurt', 'Berries']
    };
    component.mode = 'edit';
    component.editingAdditionalRecipe = recipe;
    component.ngOnChanges();

    component.onRemoveFromSchedule();

    expect(removeSpy).toHaveBeenCalledWith('ar-custom-2');
    expect(deletedEmitSpy).toHaveBeenCalledWith(recipe);
    expect(closeEmitSpy).toHaveBeenCalled();
  });
});
