import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';

export type DietGoal = 'loss' | 'gain';
export type DietType = 'veg' | 'nonveg' | 'both';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export interface DietPreference {
  goal: DietGoal;
  dietType: DietType;
  updatedAt: string;
}

export interface MealOption {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTimeMinutes: number;
  veggies: string[];
}

export interface MealSlot {
  slotId: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  slotTitle: string;
  slotTime: string;
  primaryMeal: MealOption;
  alternativeOptions: MealOption[];
}

export interface DayDietPlan {
  day: DayOfWeek;
  tagline: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: MealSlot[];
  todayVeggies: { name: string; category: string; checked?: boolean }[];
}

export interface AdditionalRecipe {
  id: string;
  title: string;
  category: 'High Protein' | 'Quick 10-Min' | 'Nutrient Dense' | 'Smoothie & Detox';
  calories: number;
  protein: number;
  prepTime: string;
  dietType: DietType;
  imageIcon: string;
  description: string;
  keyIngredients: string[];
  instructions?: string[];
}

export interface CustomDayMeal {
  id: string;
  day: DayOfWeek;
  slotId: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  veggies: string[];
  createdAt: string;
}

export interface EditedDayMeal {
  id: string;
  name: string;
  veggies: string[];
  slotId: 'breakfast' | 'lunch' | 'dinner';
  day: DayOfWeek;
  originalDay: DayOfWeek;
  originalSlotId: 'breakfast' | 'lunch' | 'dinner';
}

const STORAGE_KEY = 'apdock_diet_preference';
export const CUSTOM_RECIPES_STORAGE_KEY = 'apdock_custom_recipes';
export const CUSTOM_DAY_MEALS_STORAGE_KEY = 'apdock_custom_day_meals';
export const REMOVED_DAY_MEALS_STORAGE_KEY = 'apdock_removed_day_meals';
export const EDITED_DAY_MEALS_STORAGE_KEY = 'apdock_edited_day_meals';
export const REMOVED_ADDITIONAL_RECIPES_STORAGE_KEY = 'apdock_removed_additional_recipes';
export const EDITED_ADDITIONAL_RECIPES_STORAGE_KEY = 'apdock_edited_additional_recipes';

@Injectable({
  providedIn: 'root'
})
export class DietService {
  private readonly auth = inject(AuthService);

  readonly preference = signal<DietPreference | null>(this.loadStoredPreference());

  readonly hasPreference = computed(() => !!this.preference());

  constructor() {
    // 1. Initial check from auth user profile
    const profile = this.auth.userProfile();
    const stored = this.preference();
    if (!stored && profile && (profile as any).dietPreference) {
      this.preference.set((profile as any).dietPreference);
    }

    // 2. Reactive sync when user logs in or profile updates from Firestore backend
    effect(() => {
      const userProfile = this.auth.userProfile();
      if (userProfile && (userProfile as any).dietPreference) {
        const backendPref = (userProfile as any).dietPreference as DietPreference;
        this.preference.set(backendPref);
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(backendPref));
          }
        } catch {}
      }
    });
  }

  private loadStoredPreference(): DietPreference | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // fallback
    }
    return null;
  }

  async savePreference(goal: DietGoal, dietType: DietType): Promise<void> {
    const pref: DietPreference = {
      goal,
      dietType,
      updatedAt: new Date().toISOString()
    };
    this.preference.set(pref);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
      }
      // Sync to user profile in auth & Firestore backend
      await this.auth.updateDietPreference(pref);
    } catch {
      // safe fallback
    }
  }

  clearPreference(): void {
    this.preference.set(null);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }

  getCurrentDayName(): DayOfWeek {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const current = days[new Date().getDay()];
    return current;
  }

  private dietDatabase: Record<DietGoal, Record<DietType, Record<DayOfWeek, DayDietPlan>>> | null = null;
  private dietDbPromise: Promise<Record<DietGoal, Record<DietType, Record<DayOfWeek, DayDietPlan>>>> | null = null;

  async loadDietDatabase(): Promise<Record<DietGoal, Record<DietType, Record<DayOfWeek, DayDietPlan>>>> {
    if (this.dietDatabase) {
      return this.dietDatabase;
    }
    if (!this.dietDbPromise) {
      this.dietDbPromise = import('../data/diet-database').then(m => {
        this.dietDatabase = m.DIET_DATABASE;
        return this.dietDatabase;
      });
    }
    return this.dietDbPromise;
  }

  getDayPlan(day: DayOfWeek, goal: DietGoal, dietType: DietType): DayDietPlan {
    if (!this.dietDatabase) {
      return this.enrichDayPlanWithCustomMeals(this.getFallbackPlan(day), day);
    }
    const plans = this.dietDatabase[goal][dietType];
    const basePlan = plans[day] || plans['Wednesday'];
    return this.enrichDayPlanWithCustomMeals(basePlan, day);
  }

  async fetchDayPlan(day: DayOfWeek, goal: DietGoal, dietType: DietType): Promise<DayDietPlan> {
    await this.loadDietDatabase();
    return this.getDayPlan(day, goal, dietType);
  }

  private getFallbackPlan(day: DayOfWeek): DayDietPlan {
    return {
      day,
      tagline: 'Personalized Daily Nutrition Plan',
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      meals: [],
      todayVeggies: []
    };
  }

  getCurrentTimeSlot(): 'breakfast' | 'lunch' | 'dinner' {
    const hour = new Date().getHours();
    // Before 12:00 PM -> Breakfast
    if (hour < 12) {
      return 'breakfast';
    }
    // 12:00 PM to 6:30 PM -> Lunch
    if (hour < 18) {
      return 'lunch';
    }
    // Evening & Night -> Dinner
    return 'dinner';
  }

  getTimeSlotContext(slotId: 'breakfast' | 'lunch' | 'snack' | 'dinner') {
    switch (slotId) {
      case 'breakfast':
        return {
          id: 'breakfast' as const,
          title: 'Breakfast',
          timingRange: 'Morning (7:00 AM - 11:30 AM)',
          tagline: 'Morning Energy & Metabolic Kickstart',
          icon: '🌅',
          badgeText: 'Morning Plan',
          periodName: 'Morning'
        };
      case 'lunch':
        return {
          id: 'lunch' as const,
          title: 'Lunch',
          timingRange: 'Afternoon (12:00 PM - 4:00 PM)',
          tagline: 'Sustained Afternoon Focus & Fuel',
          icon: '☀️',
          badgeText: 'Afternoon Plan',
          periodName: 'Afternoon'
        };
      case 'snack':
        return {
          id: 'snack' as const,
          title: 'Evening Snack',
          timingRange: 'Late Afternoon (4:30 PM - 7:00 PM)',
          tagline: 'Craving Control & Clean Recharge',
          icon: '☕',
          badgeText: 'Evening Snack',
          periodName: 'Evening'
        };
      case 'dinner':
        return {
          id: 'dinner' as const,
          title: 'Dinner',
          timingRange: 'Night (7:30 PM - 10:30 PM)',
          tagline: 'Light Digestive Rest & Recovery',
          icon: '🌙',
          badgeText: 'Night Plan',
          periodName: 'Night'
        };
    }
  }

  readonly customDayMeals = signal<CustomDayMeal[]>(this.loadCustomDayMeals());
  readonly removedDayMealIds = signal<string[]>(this.loadRemovedDayMealIds());
  readonly editedDayMeals = signal<Record<string, EditedDayMeal>>(this.loadEditedDayMeals());
  readonly removedAdditionalRecipeIds = signal<string[]>(this.loadRemovedAdditionalRecipeIds());
  readonly editedAdditionalRecipes = signal<Record<string, Partial<AdditionalRecipe>>>(this.loadEditedAdditionalRecipes());

  private loadCustomDayMeals(): CustomDayMeal[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CUSTOM_DAY_MEALS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private loadRemovedDayMealIds(): string[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(REMOVED_DAY_MEALS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private loadEditedDayMeals(): Record<string, EditedDayMeal> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(EDITED_DAY_MEALS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return {};
  }

  private loadRemovedAdditionalRecipeIds(): string[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(REMOVED_ADDITIONAL_RECIPES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  private loadEditedAdditionalRecipes(): Record<string, Partial<AdditionalRecipe>> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(EDITED_ADDITIONAL_RECIPES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return {};
  }

  isMealRemoved(id: string): boolean {
    return this.removedDayMealIds().includes(id);
  }

  addCustomDayMeal(data: {
    day: DayOfWeek;
    slotId: 'breakfast' | 'lunch' | 'dinner';
    name: string;
    veggies: string[];
  }): CustomDayMeal {
    const newMeal: CustomDayMeal = {
      id: `custom-meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      day: data.day,
      slotId: data.slotId,
      name: data.name.trim(),
      veggies: data.veggies.map(v => v.trim()).filter(Boolean),
      createdAt: new Date().toISOString()
    };

    this.customDayMeals.update(list => [newMeal, ...list]);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CUSTOM_DAY_MEALS_STORAGE_KEY, JSON.stringify(this.customDayMeals()));
      }
    } catch {}

    return newMeal;
  }

  updateScheduleRecipe(data: {
    id: string;
    name: string;
    veggies: string[];
    day: DayOfWeek;
    slotId: 'breakfast' | 'lunch' | 'dinner';
    originalDay?: DayOfWeek;
    originalSlotId?: 'breakfast' | 'lunch' | 'dinner';
  }): void {
    const origDay = data.originalDay || data.day;
    const origSlot = data.originalSlotId || data.slotId;

    const customList = this.customDayMeals();
    const customIdx = customList.findIndex(m => m.id === data.id);
    if (customIdx !== -1) {
      this.customDayMeals.update(list => {
        const updated = [...list];
        updated[customIdx] = {
          ...updated[customIdx],
          name: data.name.trim(),
          veggies: data.veggies.map(v => v.trim()).filter(Boolean),
          day: data.day,
          slotId: data.slotId
        };
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CUSTOM_DAY_MEALS_STORAGE_KEY, JSON.stringify(updated));
          }
        } catch {}
        return updated;
      });
    } else {
      this.editedDayMeals.update(map => {
        const updated = {
          ...map,
          [data.id]: {
            id: data.id,
            name: data.name.trim(),
            veggies: data.veggies.map(v => v.trim()).filter(Boolean),
            day: data.day,
            slotId: data.slotId,
            originalDay: origDay,
            originalSlotId: origSlot
          }
        };
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(EDITED_DAY_MEALS_STORAGE_KEY, JSON.stringify(updated));
          }
        } catch {}
        return updated;
      });
    }
  }

  removeRecipeFromSchedule(
    meal: MealOption,
    day: DayOfWeek,
    slotId: 'breakfast' | 'lunch' | 'dinner'
  ): AdditionalRecipe {
    // 1. Mark as removed from schedule
    this.removedDayMealIds.update(ids => {
      if (ids.includes(meal.id)) return ids;
      const next = [...ids, meal.id];
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(REMOVED_DAY_MEALS_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    // Also remove from customDayMeals if it was a custom meal
    this.customDayMeals.update(list => {
      const next = list.filter(m => m.id !== meal.id);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(CUSTOM_DAY_MEALS_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    // 2. User Requirement: "if remove that recepie will auto add to additional recepies"
    const ingredients = meal.veggies && meal.veggies.length > 0 ? meal.veggies : [meal.name];
    const additional = this.addCustomRecipe({
      title: meal.name,
      keyIngredients: ingredients,
      category: 'High Protein',
      dietType: this.preference()?.dietType || 'both'
    });

    return additional;
  }

  enrichDayPlanWithCustomMeals(basePlan: DayDietPlan, day: DayOfWeek): DayDietPlan {
    const removedSet = new Set(this.removedDayMealIds());
    const editedMap = this.editedDayMeals();

    const clonedMeals: MealSlot[] = basePlan.meals.map(slot => {
      const allBaseOptions: MealOption[] = [slot.primaryMeal, ...slot.alternativeOptions];
      const remainingOptions: MealOption[] = [];

      allBaseOptions.forEach(opt => {
        if (removedSet.has(opt.id)) {
          return;
        }
        const edit = editedMap[opt.id];
        if (edit) {
          if (edit.day !== day || edit.slotId !== slot.slotId) {
            return;
          }
          remainingOptions.push({
            ...opt,
            name: edit.name,
            veggies: edit.veggies
          });
        } else {
          remainingOptions.push(opt);
        }
      });

      // Add any edited meals moved into this day & slot from another day or slot
      Object.values(editedMap).forEach(edit => {
        if (edit.day === day && edit.slotId === slot.slotId && (edit.originalDay !== day || edit.originalSlotId !== slot.slotId)) {
          if (!removedSet.has(edit.id) && !remainingOptions.some(o => o.id === edit.id)) {
            remainingOptions.push({
              id: edit.id,
              name: edit.name,
              description: `Moved recipe`,
              calories: 320,
              protein: 18,
              carbs: 35,
              fat: 10,
              prepTimeMinutes: 15,
              veggies: edit.veggies
            });
          }
        }
      });

      // Add customDayMeals for this day & slot
      const customs = this.customDayMeals().filter(m => m.day === day && m.slotId === slot.slotId && !removedSet.has(m.id));
      customs.forEach(c => {
        if (!remainingOptions.some(o => o.id === c.id)) {
          remainingOptions.unshift({
            id: c.id,
            name: c.name,
            description: `Custom recipe with ${c.veggies.slice(0, 3).join(', ')}`,
            calories: 320,
            protein: 18,
            carbs: 35,
            fat: 10,
            prepTimeMinutes: 15,
            veggies: c.veggies
          });
        }
      });

      const primary = remainingOptions.length > 0 ? remainingOptions[0] : slot.primaryMeal;
      const alternatives = remainingOptions.length > 1 ? remainingOptions.slice(1) : [];

      return {
        ...slot,
        primaryMeal: primary,
        alternativeOptions: alternatives
      };
    });

    const existingVeggieNames = new Set(basePlan.todayVeggies.map(v => v.name.toLowerCase()));
    const additionalVeggies: { name: string; category: string; checked?: boolean }[] = [];

    clonedMeals.forEach(slot => {
      [slot.primaryMeal, ...slot.alternativeOptions].forEach(opt => {
        opt.veggies?.forEach(v => {
          if (!existingVeggieNames.has(v.toLowerCase())) {
            existingVeggieNames.add(v.toLowerCase());
            additionalVeggies.push({ name: v, category: 'Fresh' });
          }
        });
      });
    });

    return {
      ...basePlan,
      meals: clonedMeals,
      todayVeggies: [...basePlan.todayVeggies, ...additionalVeggies]
    };
  }

  readonly customRecipes = signal<AdditionalRecipe[]>(this.loadCustomRecipes());

  private loadCustomRecipes(): AdditionalRecipe[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(CUSTOM_RECIPES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  }

  addCustomRecipe(data: {
    title: string;
    keyIngredients: string[];
    category?: 'High Protein' | 'Quick 10-Min' | 'Nutrient Dense' | 'Smoothie & Detox';
    dietType?: DietType;
  }): AdditionalRecipe {
    const newRecipe: AdditionalRecipe = {
      id: `custom-ar-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      category: data.category || 'High Protein',
      calories: 280,
      protein: 16,
      prepTime: '10 mins',
      dietType: data.dietType || 'both',
      imageIcon: '🥗',
      description: `Custom recipe crafted with ${data.keyIngredients.slice(0, 3).join(', ')}.`,
      keyIngredients: data.keyIngredients.map(i => i.trim()).filter(Boolean)
    };

    this.customRecipes.update(current => [newRecipe, ...current]);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, JSON.stringify(this.customRecipes()));
      }
    } catch {}

    return newRecipe;
  }

  getAdditionalRecipes(dietType: DietType, goal: DietGoal): AdditionalRecipe[] {
    const removedSet = new Set(this.removedAdditionalRecipeIds());
    const editedMap = this.editedAdditionalRecipes();
    const combined = [...this.customRecipes(), ...ADDITIONAL_RECIPES];
    return combined
      .filter(r => !removedSet.has(r.id))
      .map(r => {
        const edit = editedMap[r.id];
        return edit ? { ...r, ...edit } : r;
      })
      .filter(r => {
        if (dietType === 'veg' && r.dietType === 'nonveg') return false;
        if (dietType === 'nonveg' && r.dietType === 'veg') return false;
        return true;
      });
  }

  updateAdditionalRecipe(data: {
    id: string;
    title: string;
    keyIngredients: string[];
    dietType?: DietType;
    category?: 'High Protein' | 'Quick 10-Min' | 'Nutrient Dense' | 'Smoothie & Detox';
  }): AdditionalRecipe {
    const customList = this.customRecipes();
    const customIdx = customList.findIndex(r => r.id === data.id);

    if (customIdx !== -1) {
      let updatedRecipe!: AdditionalRecipe;
      this.customRecipes.update(list => {
        const next = [...list];
        next[customIdx] = {
          ...next[customIdx],
          title: data.title.trim(),
          keyIngredients: data.keyIngredients.map(i => i.trim()).filter(Boolean),
          dietType: data.dietType || next[customIdx].dietType,
          category: data.category || next[customIdx].category
        };
        updatedRecipe = next[customIdx];
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, JSON.stringify(next));
          }
        } catch {}
        return next;
      });
      return updatedRecipe;
    } else {
      const updatedFields: Partial<AdditionalRecipe> = {
        title: data.title.trim(),
        keyIngredients: data.keyIngredients.map(i => i.trim()).filter(Boolean),
        dietType: data.dietType,
        category: data.category
      };

      this.editedAdditionalRecipes.update(map => {
        const next = { ...map, [data.id]: { ...(map[data.id] || {}), ...updatedFields } };
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(EDITED_ADDITIONAL_RECIPES_STORAGE_KEY, JSON.stringify(next));
          }
        } catch {}
        return next;
      });

      const defaultRecipe = ADDITIONAL_RECIPES.find(r => r.id === data.id);
      return {
        ...(defaultRecipe || {
          id: data.id,
          calories: 250,
          protein: 15,
          prepTime: '10 mins',
          imageIcon: '🥗',
          description: ''
        }),
        ...updatedFields
      } as AdditionalRecipe;
    }
  }

  removeAdditionalRecipe(recipeId: string): void {
    this.customRecipes.update(list => {
      const next = list.filter(r => r.id !== recipeId);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(CUSTOM_RECIPES_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    this.editedAdditionalRecipes.update(map => {
      if (!map[recipeId]) return map;
      const next = { ...map };
      delete next[recipeId];
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(EDITED_ADDITIONAL_RECIPES_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {}
      return next;
    });

    this.removedAdditionalRecipeIds.update(ids => {
      if (ids.includes(recipeId)) return ids;
      const next = [...ids, recipeId];
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(REMOVED_ADDITIONAL_RECIPES_STORAGE_KEY, JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }

  moveAdditionalRecipeToSchedule(data: {
    recipe: AdditionalRecipe;
    slotId: 'breakfast' | 'lunch' | 'dinner';
    day: DayOfWeek;
    applyToAllDays?: boolean;
  }): CustomDayMeal[] {
    const daysToApply: DayOfWeek[] = data.applyToAllDays
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      : [data.day];

    const createdMeals: CustomDayMeal[] = [];
    const ingredients = data.recipe.keyIngredients && data.recipe.keyIngredients.length > 0
      ? data.recipe.keyIngredients
      : [data.recipe.title];

    daysToApply.forEach(d => {
      const meal = this.addCustomDayMeal({
        day: d,
        slotId: data.slotId,
        name: data.recipe.title,
        veggies: ingredients
      });
      createdMeals.push(meal);
    });

    // Remove from Additional Recipes (user preference: true move)
    this.removeAdditionalRecipe(data.recipe.id);

    return createdMeals;
  }
}

// ============================================================================
// ADDITIONAL RECIPE TYPES (Bottom Carousel / Grid)
// ============================================================================

export const ADDITIONAL_RECIPES: AdditionalRecipe[] = [
  {
    id: 'ar-1',
    title: 'Protein Avocado Tofu Toast',
    category: 'High Protein',
    calories: 290,
    protein: 16,
    prepTime: '8 mins',
    dietType: 'veg',
    imageIcon: '🥑',
    description: 'Crisp sourdough spread with ripe avocado, grilled turmeric tofu cubes, and chilli flakes.',
    keyIngredients: ['Sourdough', 'Ripe Avocado', 'Firm Tofu', 'Lemon Juice', 'Chilli Flakes'],
    instructions: [
      'Toast sourdough slices until crisp and golden brown.',
      'In a bowl, roughly mash the ripe avocado with a squeeze of fresh lemon, sea salt, and black pepper.',
      'Pan-sear cubed firm tofu in a teaspoon of olive oil with a pinch of turmeric for 3 minutes.',
      'Generously layer mashed avocado over toast, crown with warm golden tofu, and dust with chilli flakes.'
    ]
  },
  {
    id: 'ar-2',
    title: 'Herb Lemon Grilled Chicken Skewers',
    category: 'High Protein',
    calories: 340,
    protein: 36,
    prepTime: '15 mins',
    dietType: 'nonveg',
    imageIcon: '🍗',
    description: 'Juicy chicken breast cubes marinated in hung curd, lemon, garlic, and fresh rosemary.',
    keyIngredients: ['Chicken Breast', 'Hung Curd', 'Garlic', 'Rosemary', 'Olive Oil'],
    instructions: [
      'Cut chicken breasts into uniform 1-inch bite-sized cubes.',
      'Whisk hung curd, crushed garlic cloves, lemon zest, olive oil, dried rosemary, and rock salt.',
      'Toss chicken into the marinade and let rest for 10-15 minutes.',
      'Skewer and sear in a hot grill pan or air fryer at 190°C for 8-10 minutes until lightly charred and juicy.'
    ]
  },
  {
    id: 'ar-3',
    title: '10-Min Masala Oats Khichdi',
    category: 'Quick 10-Min',
    calories: 260,
    protein: 11,
    prepTime: '10 mins',
    dietType: 'veg',
    imageIcon: '🍲',
    description: 'Quick-cooking rolled oats tempered with cumin, tomatoes, green peas, and mild turmeric.',
    keyIngredients: ['Rolled Oats', 'Green Peas', 'Tomatoes', 'Cumin', 'Ghee'],
    instructions: [
      'Heat half a teaspoon of ghee in a saucepan; add cumin seeds and slit green chillies until fragrant.',
      'Toss in chopped tomatoes and sweet green peas; sauté for 2 minutes until soft.',
      'Stir in rolled oats, turmeric powder, and 1.5 cups of warm water with salt to taste.',
      'Simmer on medium heat for 4-5 minutes until porridge turns thick and creamy. Garnish with cilantro.'
    ]
  },
  {
    id: 'ar-4',
    title: 'Green Monster Detox Smoothie',
    category: 'Smoothie & Detox',
    calories: 180,
    protein: 9,
    prepTime: '5 mins',
    dietType: 'veg',
    imageIcon: '🥤',
    description: 'Nutrient-rich power blend of baby spinach, green apple, cucumber, mint, and chia seeds.',
    keyIngredients: ['Baby Spinach', 'Green Apple', 'Cucumber', 'Mint Leaves', 'Chia Seeds'],
    instructions: [
      'Wash fresh baby spinach thoroughly; core and cube half a crisp green apple and cucumber.',
      'Place spinach, apple, cucumber, and 6-8 fresh mint leaves into a high-speed blender.',
      'Pour in 200ml chilled coconut water or filtered water with a dash of lime juice.',
      'Blend on high for 60 seconds until silky; stir in soaked chia seeds and enjoy chilled.'
    ]
  },
  {
    id: 'ar-5',
    title: 'Egg White Veggie Scramble Bowl',
    category: 'Quick 10-Min',
    calories: 220,
    protein: 24,
    prepTime: '7 mins',
    dietType: 'nonveg',
    imageIcon: '🍳',
    description: 'Quick skillet of 4 egg whites sautéed with crunchy bell peppers, onions, and black pepper.',
    keyIngredients: ['Egg Whites', 'Bell Peppers', 'Onions', 'Black Pepper', 'Olive Oil'],
    instructions: [
      'Separate 4 egg whites into a bowl, whisk lightly with a pinch of pink salt and black pepper.',
      'Heat olive oil in a non-stick skillet; toss in diced bell peppers and onions for 2 minutes.',
      'Pour egg whites into skillet and gently push with a spatula from edges to center over low heat.',
      'Take off the heat while still velvety soft. Plate immediately with sliced cherry tomatoes.'
    ]
  },
  {
    id: 'ar-6',
    title: 'Roasted Chickpea & Quinoa Bowl',
    category: 'Nutrient Dense',
    calories: 380,
    protein: 18,
    prepTime: '12 mins',
    dietType: 'veg',
    imageIcon: '🥗',
    description: 'Crispy oven-baked chickpeas layered over warm quinoa, cucumbers, and tahini lemon dressing.',
    keyIngredients: ['Boiled Chickpeas', 'Quinoa', 'Cucumbers', 'Tahini', 'Lemon'],
    instructions: [
      'Pat boiled chickpeas dry and toss with olive oil, smoked paprika, ground cumin, and salt.',
      'Pan-roast or air-fry at 200°C for 8 minutes until crunchy on the outside.',
      'Build your bowl with a foundation of warm boiled quinoa, crisp sliced cucumbers, and arugula.',
      'Top with spiced crunchy chickpeas and drizzle generously with whisked tahini-lemon dressing.'
    ]
  },
  {
    id: 'ar-7',
    title: 'Smoked Paprika Paneer Tikka Wrap',
    category: 'High Protein',
    calories: 350,
    protein: 22,
    prepTime: '10 mins',
    dietType: 'veg',
    imageIcon: '🌯',
    description: 'Warm whole wheat wrap filled with smoky grilled cottage cheese, onions, and mint yogurt dip.',
    keyIngredients: ['Paneer', 'Whole Wheat Roti', 'Red Onion', 'Mint Chutney', 'Hung Curd'],
    instructions: [
      'Marinate paneer strips with hung curd, smoked paprika, garam masala, and lemon juice.',
      'Sear paneer strips in a hot skillet for 4 minutes until golden on all sides.',
      'Warm a whole wheat roti or tortilla on a flat tawa.',
      'Spread mint yogurt chutney, lay paneer strips with crunchy red onion rings, wrap snugly, and slice.'
    ]
  },
  {
    id: 'ar-8',
    title: 'Citrus Herb Tuna Protein Salad',
    category: 'Nutrient Dense',
    calories: 310,
    protein: 34,
    prepTime: '8 mins',
    dietType: 'nonveg',
    imageIcon: '🐟',
    description: 'Flaked skipjack tuna tossed with fresh baby greens, Kalamata olives, cucumbers, and citrus dressing.',
    keyIngredients: ['Canned Tuna in Water', 'Mixed Greens', 'Cucumbers', 'Lemon', 'Extra Virgin Olive Oil'],
    instructions: [
      'Drain canned tuna chunks thoroughly in a fine mesh sieve.',
      'In a salad bowl, whisk extra virgin olive oil, fresh lemon juice, Dijon mustard, and cracked black pepper.',
      'Toss crisp mixed salad greens and sliced baby cucumbers in the dressing.',
      'Flake tuna over the greens, scatter Kalamata olives, and gently fold together.'
    ]
  }
];
