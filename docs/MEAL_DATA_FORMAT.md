# Firestore Meal Data Format & Architecture Reference

## 1. Overview & Architecture

All meal data is stored in **Cloud Firestore** under the top-level collection:
`/meals/{id}`

The client uses an **offline-first, low-network-optimized Stale-While-Revalidate (SWR)** architecture:
- **Instant Paint (0ms)**: Reads from `localStorage` cache immediately on app launch.
- **Background Sync**: Silently queries Firestore `meals` collection in the background with a 4.5s timeout.
- **Shimmer Loaders**: If day data is loading or being fetched for the first time, skeleton shimmer cards are displayed for Meals, Vegetables, and Additional Recipes without layout shift.
- **Resilient Offline**: Custom meals, moved recipes, and edits are stored locally and enriched on top of the Firestore catalog.

---

## 2. Meal JSON Format

Each meal is a flat, lightweight document:

```json
{
  "id": "coffee",
  "name": "Coffee",
  "category": "breakfast",
  "mealRole": "beverage",
  "dietType": "vegetarian",
  "goals": ["weight_gain", "weight_loss"],
  "ingredients": ["coffee", "milk", "water"],
  "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
}
```

### Field Definitions

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier (e.g. `"coffee"`, `"oats_bowl"`). Used as document ID in Firestore. |
| `name` | `string` | Human-readable title of the dish (e.g. `"Coffee"`, `"Paneer Rice Bowl"`). |
| `category` | `string` | Slot placement: `"breakfast"`, `"lunch"`, `"dinner"`, or `"alternate"`. |
| `mealRole` | `string` (optional) | Role of the item: `"main"`, `"beverage"`, `"side"`, `"snack"`. |
| `dietType` | `string` | `"vegetarian"`, `"non-vegetarian"`, `"veg"`, `"nonveg"`, or `"both"`. |
| `goals` | `string[]` | Target goals: `["weight_gain", "weight_loss"]`, `["loss"]`, `["gain"]`, or `["all"]`. |
| `ingredients` | `string[]` | List of ingredients. Used for the dish description and automatically populates the "Vegetables Required" section. |
| `day` | `string[]` | Array of days: `["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]`. Leave empty `[]` to apply to all 7 days. |

---

## 3. Alternatives Section (`category: "alternate"`)

When a meal has `"category": "alternate"`, it automatically appears in the **Additional Recipes / Alternatives** section at the bottom of the Diet page:

```json
{
  "id": "green_tea",
  "name": "Green Tea & Lemon",
  "category": "alternate",
  "mealRole": "beverage",
  "dietType": "vegetarian",
  "goals": ["weight_gain", "weight_loss"],
  "ingredients": ["green tea leaves", "lemon", "warm water", "honey"],
  "day": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
}
```

Users can tap on any recipe in this section to view its ingredients or click **Move to Schedule** to place it into their Breakfast, Lunch, or Dinner plan.

---

## 4. How to Seed Meals to Firestore

You can seed or update meals in Firestore at any time:

### Option A: Using the CLI script
Create a JSON file with an array of meals (e.g. `my-meals.json`) and run:
```bash
node scripts/seed-meals-firestore.mjs my-meals.json
```
If no file is provided, it seeds the built-in balanced defaults:
```bash
node scripts/seed-meals-firestore.mjs
```

### Option B: Firebase Console
Navigate to [Firebase Console](https://console.firebase.google.com/) -> Firestore Database -> `meals` collection -> Add document. Set Document ID to `meal.id` and add the fields matching the schema above.
