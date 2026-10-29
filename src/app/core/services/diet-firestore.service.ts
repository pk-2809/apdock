import { Injectable, signal } from '@angular/core';
import { getApps, initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  Firestore
} from 'firebase/firestore/lite';
import { firebaseConfig } from '../firebase.config';
import { MealDocument } from '../models/meal.model';

export const MEALS_CACHE_STORAGE_KEY = 'apdock_firestore_meals_cache';
export const MEALS_CACHE_TS_KEY = 'apdock_firestore_meals_cache_ts';

export const DEFAULT_MEALS: MealDocument[] = [
  {
    id: 'besan-cheela',
    name: 'Besan Cheela',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['besan', 'onion', 'tomato', 'green_chilli', 'oil'],
    day: ['Monday']
  },
  {
    id: 'eggs',
    name: 'Eggs',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'non_vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['egg', 'salt'],
    day: ['Monday', 'Wednesday', 'Friday', 'Sunday']
  },
  {
    id: 'omelette',
    name: 'Omelette',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'non_vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['egg', 'onion', 'green_chilli', 'salt', 'oil'],
    day: ['Monday', 'Wednesday', 'Friday', 'Sunday']
  },
  {
    id: 'half-egg-fry',
    name: 'Half Egg Fry',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'non_vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['egg', 'salt', 'black_pepper', 'oil'],
    day: ['Monday', 'Wednesday', 'Friday', 'Sunday']
  },
  {
    id: 'vegetable-poha',
    name: 'Vegetable Poha',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['poha', 'onion', 'potato', 'peas', 'mustard_seeds', 'oil', 'turmeric'],
    day: ['Tuesday', 'Sunday']
  },
  {
    id: 'fried-jave',
    name: 'Fried Jave',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['jave', 'onion', 'vegetables', 'oil', 'salt'],
    day: ['Tuesday', 'Friday']
  },
  {
    id: 'sabudana-khichdi',
    name: 'Sabudana Khichdi',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['sabudana', 'potato', 'peanuts', 'cumin', 'oil', 'salt'],
    day: ['Tuesday', 'Saturday']
  },
  {
    id: 'vegetable-dalia',
    name: 'Vegetable Dalia',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['dalia', 'carrot', 'peas', 'onion', 'oil', 'salt'],
    day: ['Wednesday', 'Saturday']
  },
  {
    id: 'vegetable-upma',
    name: 'Vegetable Upma',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['semolina', 'onion', 'carrot', 'peas', 'mustard_seeds', 'oil', 'salt'],
    day: ['Thursday']
  },
  {
    id: 'oats',
    name: 'Oats',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['oats', 'milk', 'water'],
    day: ['Thursday']
  },
  {
    id: 'besan-soyabean-cheela',
    name: 'Besan and Soyabean Cheela',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['besan', 'soyabean_flour', 'onion', 'green_chilli', 'oil'],
    day: ['Thursday']
  },
  {
    id: 'fried-kaale-chane',
    name: 'Fried Kaale Chane',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['black_chickpeas', 'onion', 'green_chilli', 'oil', 'salt'],
    day: ['Friday']
  },
  {
    id: 'moong-dal-chilla',
    name: 'Moong Dal Chilla',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['moong_dal', 'ginger', 'green_chilli', 'onion', 'oil'],
    day: ['Saturday']
  },
  {
    id: 'veg-sandwich',
    name: 'Veg Sandwich',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['bread', 'potato', 'onion', 'tomato', 'cucumber', 'butter'],
    day: ['Sunday']
  },
  {
    id: 'milk',
    name: 'Milk',
    category: 'breakfast',
    mealRole: 'beverage',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['milk'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    id: 'tea',
    name: 'Tea',
    category: 'breakfast',
    mealRole: 'beverage',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['tea_leaves', 'milk', 'water'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'breakfast',
    mealRole: 'beverage',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['coffee', 'milk', 'water'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    id: 'bhindi-lunch',
    name: 'Bhindi',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['bhindi', 'onion', 'oil', 'spices'],
    day: ['Monday']
  },
  {
    id: 'moong-dal-lunch',
    name: 'Moong Dal',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['moong_dal', 'turmeric', 'cumin', 'salt'],
    day: ['Monday']
  },
  {
    id: 'roti-lunch-monday',
    name: 'Roti',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Monday']
  },
  {
    id: 'salad-lunch-monday',
    name: 'Salad',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    id: 'lauki-sabji',
    name: 'Lauki Sabji',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['lauki', 'onion', 'tomato', 'oil', 'spices'],
    day: ['Monday']
  },
  {
    id: 'roti-dinner-monday',
    name: 'Roti',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Monday']
  },
  {
    id: 'chole',
    name: 'Chole',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['chickpeas', 'onion', 'tomato', 'ginger', 'garlic', 'spices'],
    day: ['Tuesday']
  },
  {
    id: 'rice-lunch-tuesday',
    name: 'Rice',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['rice', 'water', 'salt'],
    day: ['Tuesday']
  },
  {
    id: 'salad-lunch-tuesday',
    name: 'Salad',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Tuesday']
  },
  {
    id: 'gobi-sabji',
    name: 'Gobi Sabji',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cauliflower', 'potato', 'onion', 'oil', 'spices'],
    day: ['Tuesday']
  },
  {
    id: 'roti-dinner-tuesday',
    name: 'Roti',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Tuesday']
  },
  {
    id: 'salad-dinner-tuesday',
    name: 'Salad',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Tuesday']
  },
  {
    id: 'torai',
    name: 'Torai',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['torai', 'onion', 'oil', 'spices'],
    day: ['Wednesday']
  },
  {
    id: 'roti-lunch-wednesday',
    name: 'Roti',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Wednesday']
  },
  {
    id: 'salad-lunch-wednesday',
    name: 'Salad',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Wednesday']
  },
  {
    id: 'arhar-dal',
    name: 'Arhar Dal',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['arhar_dal', 'turmeric', 'cumin', 'salt'],
    day: ['Wednesday']
  },
  {
    id: 'rice-dinner-wednesday',
    "name": 'Rice',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['rice', 'water', 'salt'],
    day: ['Wednesday']
  },
  {
    id: 'kaale-chane',
    name: 'Kaale Chane',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['black_chickpeas', 'onion', 'tomato', 'spices'],
    day: ['Thursday']
  },
  {
    id: 'roti-lunch-thursday',
    name: 'Roti',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Thursday']
  },
  {
    id: 'salad-lunch-thursday',
    name: 'Salad',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Thursday']
  },
  {
    id: 'tamatar-aloo',
    name: 'Tamatar Aloo',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['potato', 'tomato', 'oil', 'spices'],
    day: ['Thursday']
  },
  {
    id: 'roti-dinner-thursday',
    name: 'Roti',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Thursday']
  },
  {
    id: 'soyabean-aloo-sabji',
    name: 'Soyabean Aloo Sabji',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['soyabean', 'potato', 'onion', 'tomato', 'oil', 'spices'],
    day: ['Friday']
  },
  {
    id: 'roti-lunch-friday',
    name: 'Roti',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Friday']
  },
  {
    id: 'salad-lunch-friday',
    name: 'Salad',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Friday']
  },
  {
    id: 'aloo-shimla-mirch',
    name: 'Aloo Shimla Mirch',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['potato', 'capsicum', 'onion', 'oil', 'spices'],
    day: ['Friday']
  },
  {
    id: 'roti-dinner-friday',
    name: 'Roti',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Friday']
  },
  {
    id: 'salad-dinner-friday',
    name: 'Salad',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Friday']
  },
  {
    id: 'rajma',
    name: 'Rajma',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['rajma', 'onion', 'tomato', 'ginger', 'garlic', 'spices'],
    day: ['Saturday']
  },
  {
    id: 'rice-lunch-saturday',
    name: 'Rice',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['rice', 'water', 'salt'],
    day: ['Saturday']
  },
  {
    id: 'bhindi-dinner',
    name: 'Bhindi',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['bhindi', 'onion', 'oil', 'spices'],
    day: ['Saturday']
  },
  {
    id: 'chach',
    name: 'Chach',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['curd', 'water', 'roasted_cumin', 'salt'],
    day: ['Saturday']
  },
  {
    id: 'roti-dinner-saturday',
    name: 'Roti',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Saturday']
  },
  {
    id: 'salad-dinner-saturday',
    name: 'Salad',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['cucumber', 'tomato', 'onion', 'carrot', 'lemon'],
    day: ['Saturday']
  },
  {
    id: 'masoor-dal',
    name: 'Masoor Dal',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['masoor_dal', 'turmeric', 'cumin', 'salt'],
    day: ['Sunday']
  },
  {
    id: 'roti-lunch-sunday',
    name: 'Roti',
    category: 'lunch',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Sunday']
  },
  {
    id: 'paneer',
    name: 'Paneer',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['paneer', 'onion', 'tomato', 'oil', 'spices'],
    day: ['Sunday']
  },
  {
    id: 'roti-dinner-sunday',
    name: 'Roti',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['wheat_flour', 'water'],
    day: ['Sunday']
  },
  {
    id: 'rice-dinner-sunday',
    name: 'Rice',
    category: 'dinner',
    mealRole: 'component',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['rice', 'water', 'salt'],
    day: ['Sunday']
  }
];

@Injectable({
  providedIn: 'root'
})
export class DietFirestoreService {
  private firestoreInstance: Firestore | null = null;
  readonly meals = signal<MealDocument[]>(this.loadCachedMeals());
  readonly isFetching = signal<boolean>(false);

  private inFlightFetch: Promise<MealDocument[]> | null = null;
  private lastFetchedAt = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh window

  constructor() {
    this.initFirestore();
  }

  private initFirestore(): void {
    const isTestEnv = typeof (globalThis as any).__vitest_environment__ !== 'undefined' || typeof (globalThis as any).vi !== 'undefined';
    if (isTestEnv) {
      return;
    }

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
        const rawTs = localStorage.getItem(MEALS_CACHE_TS_KEY);
        if (rawTs) {
          const ts = Number(rawTs);
          if (!isNaN(ts) && ts > 0) {
            this.lastFetchedAt = ts;
          }
        }
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
   * Includes in-flight coalescing and 5-minute client-side TTL to prevent excessive reads under load.
   */
  async fetchMeals(forceOrLimit: boolean | number = false, timeoutMs = 4500): Promise<MealDocument[]> {
    const force = typeof forceOrLimit === 'boolean' ? forceOrLimit : false;

    // 1. Offline fast-path: Instant 0ms return if device is offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return this.meals();
    }

    // 2. Freshness check: Skip network call if cached recently within TTL and not forced
    const now = Date.now();
    if (!force && this.lastFetchedAt > 0 && now - this.lastFetchedAt < this.CACHE_TTL_MS && this.meals().length > 0) {
      return this.meals();
    }

    // 3. In-flight coalescing: Return existing promise if a fetch is already running
    if (this.inFlightFetch) {
      return this.inFlightFetch;
    }

    if (!this.firestoreInstance) {
      this.initFirestore();
    }
    if (!this.firestoreInstance) {
      return this.meals();
    }

    this.isFetching.set(true);

    this.inFlightFetch = (async () => {
      try {
        const fetchPromise = (async () => {
          const mealsCol = collection(this.firestoreInstance!, 'meals');
          const snap = await getDocs(mealsCol);
          if (snap.empty) {
            return null;
          }

          const toCleanArray = (val: unknown, altVal?: unknown): string[] => {
            if (Array.isArray(val)) return val.map(x => String(x).trim()).filter(Boolean);
            if (Array.isArray(altVal)) return altVal.map(x => String(x).trim()).filter(Boolean);
            if (typeof val === 'string' && val.trim()) {
              return val.includes(',') ? val.split(',').map(s => s.trim()).filter(Boolean) : [val.trim()];
            }
            if (typeof altVal === 'string' && altVal.trim()) {
              return altVal.includes(',') ? altVal.split(',').map(s => s.trim()).filter(Boolean) : [altVal.trim()];
            }
            return [];
          };

          const items: MealDocument[] = [];
          snap.forEach(docSnap => {
            const data = docSnap.data();
            items.push({
              id: docSnap.id,
              name: data['name'] || docSnap.id,
              category: (data['category'] || 'breakfast').toString().trim(),
              mealRole: data['mealRole'] ? data['mealRole'].toString().trim() : undefined,
              dietType: (data['dietType'] || 'vegetarian').toString().trim(),
              goals: toCleanArray(data['goals'], data['goal']),
              ingredients: toCleanArray(data['ingredients'], data['ingredient']),
              day: toCleanArray(data['day'], data['days']),
              description: data['description'],
              calories: typeof data['calories'] === 'number' ? data['calories'] : undefined,
              protein: typeof data['protein'] === 'number' ? data['protein'] : undefined,
              carbs: typeof data['carbs'] === 'number' ? data['carbs'] : undefined,
              fat: typeof data['fat'] === 'number' ? data['fat'] : undefined,
              prepTimeMinutes: typeof data['prepTimeMinutes'] === 'number' ? data['prepTimeMinutes'] : undefined
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
          this.lastFetchedAt = Date.now();
          return result;
        }
      } catch {
        // In offline or slow network conditions, the cached meals are preserved
      } finally {
        this.isFetching.set(false);
        this.inFlightFetch = null;
      }

      return this.meals();
    })();

    return this.inFlightFetch;
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
