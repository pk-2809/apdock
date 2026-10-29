/**
 * Legacy Diet Database
 * ────────────────────
 * Meal data is now dynamically managed via Firestore collection `/meals/{id}`
 * with local caching and offline-first Stale-While-Revalidate support.
 *
 * See:
 * - docs/MEAL_DATA_FORMAT.md
 * - src/app/core/models/meal.model.ts
 * - src/app/core/services/diet-firestore.service.ts
 */

export const DIET_DATABASE = {} as const;
