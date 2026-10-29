import { Injectable, signal } from '@angular/core';
import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  Firestore
} from 'firebase/firestore';
import { firebaseConfig } from '../firebase.config';
import { MealDocument } from '../models/meal.model';

export const MEALS_CACHE_STORAGE_KEY = 'apdock_firestore_meals_cache';
export const MEALS_CACHE_TS_KEY = 'apdock_firestore_meals_cache_ts';

export const DEFAULT_MEALS: MealDocument[] = [
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'breakfast',
    mealRole: 'beverage',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['coffee', 'milk', 'water'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'Fresh morning brew',
    prepTimeMinutes: 5
  },
  {
    id: 'oats_bowl',
    name: 'Warm Cinnamon Oats Bowl',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['rolled oats', 'milk', 'cinnamon', 'honey'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'Slow-burning carbs for energy',
    prepTimeMinutes: 10
  },
  {
    id: 'paneer_rice_bowl',
    name: 'Paneer & Brown Rice Bowl',
    category: 'lunch',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['paneer', 'brown rice', 'broccoli', 'bell pepper', 'olive oil'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'High protein vegetarian meal',
    prepTimeMinutes: 20
  },
  {
    id: 'grilled_chicken_salad',
    name: 'Grilled Chicken & Herb Salad',
    category: 'lunch',
    mealRole: 'main',
    dietType: 'non-vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['chicken breast', 'lettuce', 'cucumber', 'cherry tomatoes', 'olive oil'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'Lean high-protein fuel',
    prepTimeMinutes: 15
  },
  {
    id: 'mixed_veg_dal',
    name: 'Mixed Veg Dal Khichdi',
    category: 'dinner',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['yellow moong dal', 'rice', 'spinach', 'carrots', 'ghee'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'Easy digestion evening meal',
    prepTimeMinutes: 25
  },
  {
    id: 'green_tea',
    name: 'Green Tea & Lemon',
    category: 'alternate',
    mealRole: 'beverage',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['green tea leaves', 'lemon', 'warm water', 'honey'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    description: 'Clean antioxidant herbal infusion',
    prepTimeMinutes: 5
  }
];

@Injectable({
  providedIn: 'root'
})
export class DietFirestoreService {
  private firestoreInstance: Firestore | null = null;
  readonly meals = signal<MealDocument[]>(this.loadCachedMeals());
  readonly isFetching = signal<boolean>(false);

  constructor() {
    this.initFirestore();
  }

  private initFirestore(): void {
    try {
      if (typeof window !== 'undefined') {
        const apps = getApps();
        const app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
        this.firestoreInstance = getFirestore(app);
      }
    } catch {
      // Graceful fallback for offline, SSR, or mocked test environments
      this.firestoreInstance = null;
    }
  }

  /**
   * Loads cached meals from localStorage for instantaneous 0ms display on startup.
   */
  loadCachedMeals(): MealDocument[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(MEALS_CACHE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    return DEFAULT_MEALS;
  }

  /**
   * Persists meals to localStorage cache for offline capability and low network speedup.
   */
  private cacheMeals(meals: MealDocument[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(MEALS_CACHE_STORAGE_KEY, JSON.stringify(meals));
        localStorage.setItem(MEALS_CACHE_TS_KEY, Date.now().toString());
      }
    } catch {}
  }

  /**
   * Fetches meals from Firestore collection 'meals' with Stale-While-Revalidate and timeout.
   * If network is slow or offline, immediately falls back to cached meals.
   */
  async fetchMeals(timeoutMs = 4500): Promise<MealDocument[]> {
    if (!this.firestoreInstance) {
      this.initFirestore();
    }
    if (!this.firestoreInstance) {
      return this.meals();
    }

    this.isFetching.set(true);

    try {
      const fetchPromise = (async () => {
        const mealsCol = collection(this.firestoreInstance!, 'meals');
        const snap = await getDocs(mealsCol);
        if (snap.empty) {
          return null;
        }

        const items: MealDocument[] = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          items.push({
            id: docSnap.id,
            name: data['name'] || docSnap.id,
            category: data['category'] || 'breakfast',
            mealRole: data['mealRole'],
            dietType: data['dietType'] || 'vegetarian',
            goals: Array.isArray(data['goals']) ? data['goals'] : [],
            ingredients: Array.isArray(data['ingredients']) ? data['ingredients'] : [],
            day: Array.isArray(data['day']) ? data['day'] : [],
            description: data['description'],
            calories: data['calories'],
            protein: data['protein'],
            carbs: data['carbs'],
            fat: data['fat'],
            prepTimeMinutes: data['prepTimeMinutes']
          });
        });
        return items;
      })();

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Firestore timeout')), timeoutMs)
      );

      const result = await Promise.race([fetchPromise, timeoutPromise]);
      if (result && result.length > 0) {
        this.meals.set(result);
        this.cacheMeals(result);
        return result;
      }
    } catch {
      // In offline or slow network conditions, the cached meals are preserved
    } finally {
      this.isFetching.set(false);
    }

    return this.meals();
  }

  /**
   * Saves or updates a single meal document in Firestore and updates local cache.
   */
  async setMeal(meal: MealDocument): Promise<void> {
    // 1. Update local state immediately
    this.meals.update(list => {
      const idx = list.findIndex(m => m.id === meal.id);
      const next = idx !== -1 ? [...list] : [meal, ...list];
      if (idx !== -1) next[idx] = meal;
      this.cacheMeals(next);
      return next;
    });

    // 2. Sync to Firestore if available
    if (this.firestoreInstance) {
      try {
        const mealRef = doc(this.firestoreInstance, 'meals', meal.id);
        await setDoc(mealRef, {
          id: meal.id,
          name: meal.name,
          category: meal.category,
          mealRole: meal.mealRole || 'main',
          dietType: meal.dietType,
          goals: meal.goals,
          ingredients: meal.ingredients,
          day: meal.day,
          description: meal.description || '',
          calories: meal.calories ?? null,
          protein: meal.protein ?? null,
          carbs: meal.carbs ?? null,
          fat: meal.fat ?? null,
          prepTimeMinutes: meal.prepTimeMinutes ?? null
        });
      } catch {
        // Silently preserve local update if offline
      }
    }
  }
}
