import { DayDietPlan, DietGoal, DietType, DayOfWeek } from '../services/diet.service';

/**
 * DIET_DATABASE
 * ─────────────
 * Provide your own meals here.
 *
 * Structure:
 *   goal  (loss | gain)
 *     └── dietType  (veg | nonveg | both)
 *           └── day  (Monday … Sunday)
 *                 └── DayDietPlan  (see JSON format doc below or format-example.md)
 *
 * Every day must supply exactly 3 MealSlots: 'breakfast', 'lunch', 'dinner'.
 * Each MealSlot must have one primaryMeal and at least 0 alternativeOptions.
 *
 * If a day is missing the app falls back to Wednesday of the same goal/dietType.
 */
export const DIET_DATABASE: Record<DietGoal, Record<DietType, Record<DayOfWeek, DayDietPlan>>> = {
  loss: {
    veg: {
      Monday:    placeholderDay('Monday'),
      Tuesday:   placeholderDay('Tuesday'),
      Wednesday: placeholderDay('Wednesday'),
      Thursday:  placeholderDay('Thursday'),
      Friday:    placeholderDay('Friday'),
      Saturday:  placeholderDay('Saturday'),
      Sunday:    placeholderDay('Sunday'),
    },
    nonveg: {
      Monday:    placeholderDay('Monday'),
      Tuesday:   placeholderDay('Tuesday'),
      Wednesday: placeholderDay('Wednesday'),
      Thursday:  placeholderDay('Thursday'),
      Friday:    placeholderDay('Friday'),
      Saturday:  placeholderDay('Saturday'),
      Sunday:    placeholderDay('Sunday'),
    },
    both: {
      Monday:    placeholderDay('Monday'),
      Tuesday:   placeholderDay('Tuesday'),
      Wednesday: placeholderDay('Wednesday'),
      Thursday:  placeholderDay('Thursday'),
      Friday:    placeholderDay('Friday'),
      Saturday:  placeholderDay('Saturday'),
      Sunday:    placeholderDay('Sunday'),
    },
  },
  gain: {
    veg: {
      Monday:    placeholderDay('Monday'),
      Tuesday:   placeholderDay('Tuesday'),
      Wednesday: placeholderDay('Wednesday'),
      Thursday:  placeholderDay('Thursday'),
      Friday:    placeholderDay('Friday'),
      Saturday:  placeholderDay('Saturday'),
      Sunday:    placeholderDay('Sunday'),
    },
    nonveg: {
      Monday:    placeholderDay('Monday'),
      Tuesday:   placeholderDay('Tuesday'),
      Wednesday: placeholderDay('Wednesday'),
      Thursday:  placeholderDay('Thursday'),
      Friday:    placeholderDay('Friday'),
      Saturday:  placeholderDay('Saturday'),
      Sunday:    placeholderDay('Sunday'),
    },
    both: {
      Monday:    placeholderDay('Monday'),
      Tuesday:   placeholderDay('Tuesday'),
      Wednesday: placeholderDay('Wednesday'),
      Thursday:  placeholderDay('Thursday'),
      Friday:    placeholderDay('Friday'),
      Saturday:  placeholderDay('Saturday'),
      Sunday:    placeholderDay('Sunday'),
    },
  },
};

/** Temporary empty plan shown until you supply real data. */
function placeholderDay(day: DayOfWeek): DayDietPlan {
  return {
    day,
    tagline: 'Your meal plan coming soon.',
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0,
    todayVeggies: [],
    meals: [
      {
        slotId: 'breakfast',
        slotTitle: 'Breakfast',
        slotTime: '8:00 AM',
        primaryMeal: {
          id: `${day}-placeholder-b`,
          name: 'Meal plan not configured yet',
          description: 'Please add your meal data to diet-database.ts.',
          calories: 0, protein: 0, carbs: 0, fat: 0,
          prepTimeMinutes: 0,
          veggies: []
        },
        alternativeOptions: []
      },
      {
        slotId: 'lunch',
        slotTitle: 'Lunch',
        slotTime: '1:00 PM',
        primaryMeal: {
          id: `${day}-placeholder-l`,
          name: 'Meal plan not configured yet',
          description: 'Please add your meal data to diet-database.ts.',
          calories: 0, protein: 0, carbs: 0, fat: 0,
          prepTimeMinutes: 0,
          veggies: []
        },
        alternativeOptions: []
      },
      {
        slotId: 'dinner',
        slotTitle: 'Dinner',
        slotTime: '8:00 PM',
        primaryMeal: {
          id: `${day}-placeholder-d`,
          name: 'Meal plan not configured yet',
          description: 'Please add your meal data to diet-database.ts.',
          calories: 0, protein: 0, carbs: 0, fat: 0,
          prepTimeMinutes: 0,
          veggies: []
        },
        alternativeOptions: []
      }
    ]
  };
}
