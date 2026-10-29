import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { DietFirestoreService } from './diet-firestore.service';
import { MealDocument } from '../models/meal.model';

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
  readonly firestoreService = inject(DietFirestoreService);

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

  private toMealOption(doc: MealDocument): MealOption {
    return {
      id: doc.id,
      name: doc.name,
      description: doc.description || (doc.mealRole ? `${doc.mealRole} option` : 'Nutritious option'),
      calories: doc.calories ?? 300,
      protein: doc.protein ?? 15,
      carbs: doc.carbs ?? 30,
      fat: doc.fat ?? 10,
      prepTimeMinutes: doc.prepTimeMinutes ?? 10,
      veggies: doc.ingredients || []
    };
  }

  private createFallbackSlot(
    slotId: 'breakfast' | 'lunch' | 'dinner',
    slotTitle: string,
    slotTime: string,
    day: DayOfWeek
  ): MealSlot {
    return {
      slotId,
      slotTitle,
      slotTime,
      primaryMeal: {
        id: `${day}-placeholder-${slotId.charAt(0)}`,
        name: 'Meal plan not configured yet',
        description: `Add a ${slotId} meal to Firestore to customize.`,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        prepTimeMinutes: 0,
        veggies: []
      },
      alternativeOptions: []
    };
  }

  buildDayPlanFromMeals(day: DayOfWeek, goal: DietGoal, dietType: DietType): DayDietPlan {
    const allMeals = this.firestoreService.meals();
    const dayNorm = day.toLowerCase();

    // 1. Filter meals matching day, goal, dietType
    const matchingMeals = allMeals.filter(m => {
      // Day check: empty array means all days, otherwise must include current day
      if (m.day && m.day.length > 0) {
        const matchesDay = m.day.some(d => d.toLowerCase() === dayNorm);
        if (!matchesDay) return false;
      }

      // Goal check:
      if (m.goals && m.goals.length > 0) {
        if (goal === 'loss') {
          const match = m.goals.some(g => ['weight_loss', 'loss', 'fat_loss', 'all'].includes(g.toLowerCase()));
          if (!match) return false;
        } else if (goal === 'gain') {
          const match = m.goals.some(g => ['weight_gain', 'gain', 'muscle_gain', 'all'].includes(g.toLowerCase()));
          if (!match) return false;
        }
      }

      // DietType check:
      if (dietType === 'veg') {
        const lower = (m.dietType || '').toLowerCase();
        if (lower.includes('non')) return false;
      } else if (dietType === 'nonveg') {
        const lower = (m.dietType || '').toLowerCase();
        if (lower === 'veg' || lower === 'vegetarian') return false;
      }
      return true;
    });

    // 2. Group by category
    const breakfastDocs = matchingMeals.filter(m => (m.category || '').toLowerCase() === 'breakfast');
    const lunchDocs = matchingMeals.filter(m => (m.category || '').toLowerCase() === 'lunch');
    const dinnerDocs = matchingMeals.filter(m => (m.category || '').toLowerCase() === 'dinner');

    const createSlot = (
      slotId: 'breakfast' | 'lunch' | 'dinner',
      slotTitle: string,
      slotTime: string,
      docs: MealDocument[]
    ): MealSlot => {
      if (docs.length === 0) {
        return this.createFallbackSlot(slotId, slotTitle, slotTime, day);
      }
      const primary = this.toMealOption(docs[0]);
      const alternatives = docs.slice(1).map(d => this.toMealOption(d));
      return {
        slotId,
        slotTitle,
        slotTime,
        primaryMeal: primary,
        alternativeOptions: alternatives
      };
    };

    const meals: MealSlot[] = [
      createSlot('breakfast', 'Breakfast', '8:00 AM', breakfastDocs),
      createSlot('lunch', 'Lunch', '1:00 PM', lunchDocs),
      createSlot('dinner', 'Dinner', '8:00 PM', dinnerDocs)
    ];

    // 3. Extract fresh veggies / ingredients from matching meals
    const veggieSet = new Set<string>();
    const todayVeggies: { name: string; category: string }[] = [];

    matchingMeals.forEach(m => {
      (m.ingredients || []).forEach(ing => {
        const trimmed = ing.trim();
        const key = trimmed.toLowerCase();
        if (trimmed && !veggieSet.has(key)) {
          veggieSet.add(key);
          const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
          todayVeggies.push({ name: capitalized, category: 'Fresh' });
        }
      });
    });

    return {
      day,
      tagline: 'Personalized Daily Nutrition Plan',
      totalCalories: meals.reduce((sum, s) => sum + s.primaryMeal.calories, 0),
      totalProtein: meals.reduce((sum, s) => sum + s.primaryMeal.protein, 0),
      totalCarbs: meals.reduce((sum, s) => sum + s.primaryMeal.carbs, 0),
      totalFat: meals.reduce((sum, s) => sum + s.primaryMeal.fat, 0),
      meals,
      todayVeggies
    };
  }

  async loadDietDatabase(): Promise<Record<DietGoal, Record<DietType, Record<DayOfWeek, DayDietPlan>>>> {
    await this.firestoreService.fetchMeals();
    const days: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const goals: DietGoal[] = ['loss', 'gain'];
    const dietTypes: DietType[] = ['veg', 'nonveg', 'both'];

    const db = {} as Record<DietGoal, Record<DietType, Record<DayOfWeek, DayDietPlan>>>;
    goals.forEach(g => {
      db[g] = {} as Record<DietType, Record<DayOfWeek, DayDietPlan>>;
      dietTypes.forEach(dt => {
        db[g][dt] = {} as Record<DayOfWeek, DayDietPlan>;
        days.forEach(d => {
          db[g][dt][d] = this.buildDayPlanFromMeals(d, g, dt);
        });
      });
    });
    return db;
  }

  getDayPlan(day: DayOfWeek, goal: DietGoal, dietType: DietType): DayDietPlan {
    const basePlan = this.buildDayPlanFromMeals(day, goal, dietType);
    return this.enrichDayPlanWithCustomMeals(basePlan, day);
  }

  async fetchDayPlan(day: DayOfWeek, goal: DietGoal, dietType: DietType): Promise<DayDietPlan> {
    await this.firestoreService.fetchMeals();
    return this.getDayPlan(day, goal, dietType);
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

  normalizeDietType(type?: string): DietType {
    const lower = (type || '').toLowerCase();
    if (lower.includes('non')) return 'nonveg';
    if (lower.includes('veg')) return 'veg';
    return 'both';
  }

  getAdditionalRecipes(dietType: DietType, goal: DietGoal): AdditionalRecipe[] {
    const removedSet = new Set(this.removedAdditionalRecipeIds());
    const editedMap = this.editedAdditionalRecipes();

    // 1. Gather alternate meals from Firestore (category="alternate")
    const firestoreAlternates: AdditionalRecipe[] = this.firestoreService
      .meals()
      .filter(m => (m.category || '').toLowerCase() === 'alternate')
      .map(m => ({
        id: m.id,
        title: m.name,
        category: 'High Protein' as const,
        calories: m.calories ?? 250,
        protein: m.protein ?? 15,
        prepTime: m.prepTimeMinutes ? `${m.prepTimeMinutes} mins` : '10 mins',
        dietType: this.normalizeDietType(m.dietType),
        imageIcon: m.mealRole === 'beverage' ? '☕' : '🥗',
        description: m.description || `Fresh recipe with ${(m.ingredients || []).slice(0, 3).join(', ')}.`,
        keyIngredients: m.ingredients || []
      }));

    const combined = [...this.customRecipes(), ...firestoreAlternates, ...ADDITIONAL_RECIPES];

    // Deduplicate by ID
    const seen = new Set<string>();
    const deduped: AdditionalRecipe[] = [];
    for (const r of combined) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        deduped.push(r);
      }
    }

    return deduped
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
// ADDITIONAL RECIPES
// Populate this array with your own recipe objects.
// See the JSON format doc at docs/MEAL_DATA_FORMAT.md.
// ============================================================================

export const ADDITIONAL_RECIPES: AdditionalRecipe[] = [
  // Add your recipes here – see docs/MEAL_DATA_FORMAT.md for the exact shape.
];

