/**
 * MealDocument
 * ────────────
 * Unified, lightweight meal model fetched directly from Firestore (/meals/{id})
 * or cached locally in localStorage for high-speed offline-first performance.
 *
 * Example Firestore document:
 * {
 *   "id": "coffee",
 *   "name": "Coffee",
 *   "category": "breakfast",
 *   "mealRole": "beverage",
 *   "dietType": "vegetarian",
 *   "goals": ["weight_gain", "weight_loss"],
 *   "ingredients": ["coffee", "milk", "water"],
 *   "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
 * }
 *
 * "category" can be "breakfast", "lunch", "dinner", or "alternate".
 * Meals with category="alternate" appear directly in the alternatives / additional recipes section.
 */

export interface MealDocument {
  id: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'alternate' | string;
  mealRole?: 'beverage' | 'main' | 'side' | 'snack' | string;
  dietType: 'vegetarian' | 'non-vegetarian' | 'veg' | 'nonveg' | 'both' | string;
  goals: string[];
  ingredients: string[];
  day: string[];
  description?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  prepTimeMinutes?: number;
}
