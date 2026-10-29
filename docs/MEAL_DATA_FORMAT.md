# Meal Data Format Reference

All meal data lives in two files:

| File | What to edit |
|------|-------------|
| `src/app/core/data/diet-database.ts` | Weekly day plans (breakfast / lunch / dinner per goal × diet-type × day) |
| `src/app/core/services/diet.service.ts` | `ADDITIONAL_RECIPES` array (recipe cards shown below the day plan) |

---

## 1 · One Day Plan (`DayDietPlan`)

```jsonc
{
  "day": "Monday",               // "Monday" | "Tuesday" | … | "Sunday"
  "tagline": "High Fiber Day",   // Short headline shown below the day chip
  "totalCalories": 1540,
  "totalProtein":  78,           // grams
  "totalCarbs":   165,           // grams
  "totalFat":      42,           // grams
  "todayVeggies": [
    { "name": "Fresh Spinach (Palak)", "category": "Leafy Green" },
    { "name": "Red Tomatoes",          "category": "Base" }
  ],
  "meals": [ /* 3 MealSlots: breakfast, lunch, dinner */ ]
}
```

---

## 2 · One Meal Slot (`MealSlot`)

```jsonc
{
  "slotId":    "breakfast",   // "breakfast" | "lunch" | "dinner"
  "slotTitle": "Breakfast",
  "slotTime":  "8:30 AM",
  "primaryMeal": { /* MealOption */ },
  "alternativeOptions": []    // 0 or more swap options
}
```

---

## 3 · One Meal Option (`MealOption`)

```jsonc
{
  "id":              "mon-loss-veg-b1",      // unique slug
  "name":            "Sprouted Moong Poha",
  "description":     "Flaked rice with sprouts and lemon.",
  "calories":        360,
  "protein":          18,
  "carbs":            48,
  "fat":               9,
  "prepTimeMinutes":  15,
  "veggies": ["Green Chillies", "Onions", "Lemon"]
}
```

---

## 4 · One Additional Recipe (`AdditionalRecipe`)

```jsonc
{
  "id":          "ar-101",
  "title":       "Masala Oats Bowl",
  "category":    "Quick 10-Min",   // "High Protein" | "Quick 10-Min" | "Nutrient Dense" | "Smoothie & Detox"
  "calories":    260,
  "protein":      11,
  "prepTime":    "10 mins",
  "dietType":    "veg",            // "veg" | "nonveg" | "both"
  "imageIcon":   "🍲",
  "description": "Oats with tomatoes, peas, and cumin.",
  "keyIngredients": ["Rolled Oats", "Green Peas", "Tomatoes"],
  "instructions": [
    "Heat ghee; add cumin.",
    "Add veggies; sauté 2 min.",
    "Stir in oats and water. Simmer 5 min."
  ]
}
```

---

## 5 · Minimal Monday example (loss → veg)

Replace `placeholderDay('Monday')` in `diet-database.ts`:

```typescript
Monday: {
  day: 'Monday',
  tagline: 'Metabolic Kickstart',
  totalCalories: 1520,
  totalProtein: 80,
  totalCarbs: 160,
  totalFat: 40,
  todayVeggies: [
    { name: 'Fresh Spinach', category: 'Leafy Green' },
    { name: 'Tomatoes',      category: 'Base' },
    { name: 'Cucumber',      category: 'Salad' }
  ],
  meals: [
    {
      slotId: 'breakfast', slotTitle: 'Breakfast', slotTime: '8:00 AM',
      primaryMeal: {
        id: 'mon-loss-veg-b1', name: 'Sprouted Moong Poha',
        description: 'Flaked rice with sprouts, peanuts, and lemon.',
        calories: 360, protein: 18, carbs: 48, fat: 9,
        prepTimeMinutes: 15, veggies: ['Green Chillies', 'Onions', 'Lemon']
      },
      alternativeOptions: []
    },
    {
      slotId: 'lunch', slotTitle: 'Lunch', slotTime: '1:30 PM',
      primaryMeal: {
        id: 'mon-loss-veg-l1', name: 'Palak Dal + 2 Roti',
        description: 'Spinach lentil curry with whole wheat flatbreads.',
        calories: 480, protein: 24, carbs: 62, fat: 11,
        prepTimeMinutes: 25, veggies: ['Spinach', 'Tomatoes', 'Garlic']
      },
      alternativeOptions: []
    },
    {
      slotId: 'dinner', slotTitle: 'Dinner', slotTime: '8:00 PM',
      primaryMeal: {
        id: 'mon-loss-veg-d1', name: 'Grilled Paneer + Tomato Soup',
        description: 'Herb-marinated cottage cheese with warm tomato broth.',
        calories: 380, protein: 22, carbs: 26, fat: 14,
        prepTimeMinutes: 20, veggies: ['Bell Peppers', 'Tomatoes', 'Garlic']
      },
      alternativeOptions: []
    }
  ]
},
```

---

## 6 · Checklist before giving me the data

- Every day needs **3 slots**: `breakfast`, `lunch`, `dinner`
- **IDs must be unique** across the whole file
- `dietType` on AdditionalRecipe: `"veg"` | `"nonveg"` | `"both"`
- `totalCalories` / macros on `DayDietPlan` are totals **you** provide (not auto-summed)
- Days you don't configure yet can stay as `placeholderDay('...')` 
