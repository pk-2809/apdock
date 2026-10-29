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

export const DEFAULT_MEALS: MealDocument[] = [];

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
