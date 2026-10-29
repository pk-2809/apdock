import { TestBed } from '@angular/core/testing';
import {
  DietFirestoreService,
  MEALS_CACHE_STORAGE_KEY,
  DEFAULT_MEALS
} from './diet-firestore.service';
import { MealDocument } from '../models/meal.model';

describe('DietFirestoreService', () => {
  let service: DietFirestoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(DietFirestoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with DEFAULT_MEALS when cache is empty', () => {
    const meals = service.meals();
    expect(meals.length).toBeGreaterThan(0);
    expect(meals.some(m => m.id === 'coffee')).toBe(true);
  });

  it('should load meals from localStorage cache if present', () => {
    const customSample: MealDocument[] = [
      {
        id: 'coffee',
        name: 'Coffee',
        category: 'breakfast',
        mealRole: 'beverage',
        dietType: 'vegetarian',
        goals: ['weight_gain', 'weight_loss'],
        ingredients: ['coffee', 'milk', 'water'],
        day: ['Monday', 'Tuesday']
      }
    ];

    localStorage.setItem(MEALS_CACHE_STORAGE_KEY, JSON.stringify(customSample));

    const loaded = service.loadCachedMeals();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe('coffee');
    expect(loaded[0].ingredients).toEqual(['coffee', 'milk', 'water']);
  });

  it('should update local signal and cache when setMeal is called', async () => {
    const newMeal: MealDocument = {
      id: 'custom_snack',
      name: 'Roasted Almonds',
      category: 'alternate',
      mealRole: 'snack',
      dietType: 'vegetarian',
      goals: ['weight_loss'],
      ingredients: ['almonds', 'salt'],
      day: ['Wednesday']
    };

    await service.setMeal(newMeal);

    expect(service.meals().some(m => m.id === 'custom_snack')).toBe(true);

    const cachedRaw = localStorage.getItem(MEALS_CACHE_STORAGE_KEY);
    expect(cachedRaw).toBeTruthy();
    const cached = JSON.parse(cachedRaw!);
    expect(cached.some((m: MealDocument) => m.id === 'custom_snack')).toBe(true);
  });

  it('should gracefully return cached meals on fetchMeals when offline or in test env', async () => {
    const result = await service.fetchMeals(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(m => m.id === 'coffee')).toBe(true);
  });
});
