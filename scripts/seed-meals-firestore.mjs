#!/usr/bin/env node
/**
 * Seed Meals to Firestore
 * ───────────────────────
 * Reads a JSON file containing an array of MealDocument objects
 * and writes each to /meals/{id} in Firestore.
 *
 * Usage:
 *   node scripts/seed-meals-firestore.mjs [path-to-meals.json]
 *
 * Example meal format in JSON:
 * [
 *   {
 *     "id": "coffee",
 *     "name": "Coffee",
 *     "category": "breakfast",
 *     "mealRole": "beverage",
 *     "dietType": "vegetarian",
 *     "goals": ["weight_gain", "weight_loss"],
 *     "ingredients": ["coffee", "milk", "water"],
 *     "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
 *   }
 * ]
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';

const firebaseConfig = {
  projectId: 'apdock',
  appId: '1:464048462179:web:8b5885c2e3052dc4421b56',
  storageBucket: 'apdock.firebasestorage.app',
  apiKey: 'AIzaSyA06ZMEYe0PZUYXJRaHAv1axV2UfdIbYEQ',
  authDomain: 'apdock.firebaseapp.com',
  messagingSenderId: '464048462179',
  projectNumber: '464048462179'
};

const DEFAULT_SAMPLE_MEALS = [
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
    id: 'oats_bowl',
    name: 'Warm Cinnamon Oats Bowl',
    category: 'breakfast',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['rolled oats', 'milk', 'cinnamon', 'honey'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    id: 'paneer_rice_bowl',
    name: 'Paneer & Brown Rice Bowl',
    category: 'lunch',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['paneer', 'brown rice', 'broccoli', 'bell pepper', 'olive oil'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    id: 'grilled_chicken_salad',
    name: 'Grilled Chicken & Herb Salad',
    category: 'lunch',
    mealRole: 'main',
    dietType: 'non-vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['chicken breast', 'lettuce', 'cucumber', 'cherry tomatoes', 'olive oil'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    id: 'mixed_veg_dal',
    name: 'Mixed Veg Dal Khichdi',
    category: 'dinner',
    mealRole: 'main',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['yellow moong dal', 'rice', 'spinach', 'carrots', 'ghee'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  {
    id: 'green_tea',
    name: 'Green Tea & Lemon',
    category: 'alternate',
    mealRole: 'beverage',
    dietType: 'vegetarian',
    goals: ['weight_gain', 'weight_loss'],
    ingredients: ['green tea leaves', 'lemon', 'warm water', 'honey'],
    day: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }
];

async function main() {
  const jsonPathArg = process.argv[2];
  let meals = DEFAULT_SAMPLE_MEALS;

  if (jsonPathArg) {
    const fullPath = path.resolve(process.cwd(), jsonPathArg);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(fullPath, 'utf8');
    meals = JSON.parse(raw);
  }

  console.log(`Found ${meals.length} meals to seed to Firestore...`);

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  const db = getFirestore(app);

  for (const meal of meals) {
    if (!meal.id) {
      console.warn('Skipping meal without id:', meal);
      continue;
    }
    const docRef = doc(db, 'meals', meal.id);
    await setDoc(docRef, {
      id: meal.id,
      name: meal.name,
      category: meal.category || 'breakfast',
      mealRole: meal.mealRole || 'main',
      dietType: meal.dietType || 'vegetarian',
      goals: Array.isArray(meal.goals) ? meal.goals : [],
      ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
      day: Array.isArray(meal.day) ? meal.day : [],
      description: meal.description || '',
      calories: meal.calories ?? null,
      protein: meal.protein ?? null,
      carbs: meal.carbs ?? null,
      fat: meal.fat ?? null,
      prepTimeMinutes: meal.prepTimeMinutes ?? null
    });
    console.log(`✔ Saved /meals/${meal.id} (${meal.name})`);
  }

  console.log('✅ Seeding complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to seed meals:', err);
  process.exit(1);
});
