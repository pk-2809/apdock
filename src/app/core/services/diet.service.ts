import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';

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
}

const STORAGE_KEY = 'apdock_diet_preference';

@Injectable({
  providedIn: 'root'
})
export class DietService {
  private readonly auth = inject(AuthService);

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

  getDayPlan(day: DayOfWeek, goal: DietGoal, dietType: DietType): DayDietPlan {
    const plans = DIET_DATABASE[goal][dietType];
    return plans[day] || plans['Wednesday'];
  }

  getAdditionalRecipes(dietType: DietType, goal: DietGoal): AdditionalRecipe[] {
    return ADDITIONAL_RECIPES.filter(r => {
      if (dietType === 'veg' && r.dietType === 'nonveg') return false;
      if (dietType === 'nonveg' && r.dietType === 'veg') return false;
      return true;
    });
  }
}

// ============================================================================
// COMPREHENSIVE DIET DATABASE
// ============================================================================

const DIET_DATABASE: Record<DietGoal, Record<DietType, Record<DayOfWeek, DayDietPlan>>> = {
  loss: {
    veg: {
      Wednesday: {
        day: 'Wednesday',
        tagline: 'High Fiber & Metabolic Cleanse',
        totalCalories: 1540,
        totalProtein: 78,
        totalCarbs: 165,
        totalFat: 42,
        todayVeggies: [
          { name: 'Fresh Spinach (Palak)', category: 'Leafy Green' },
          { name: 'Red Tomatoes', category: 'Base' },
          { name: 'Cucumbers', category: 'Salad' },
          { name: 'Green Bell Peppers (Capsicum)', category: 'Veggies' },
          { name: 'Zucchini / Lauki', category: 'Gourd' },
          { name: 'Ginger & Garlic', category: 'Aromatics' },
          { name: 'Fresh Coriander & Lemon', category: 'Garnish' }
        ],
        meals: [
          {
            slotId: 'breakfast',
            slotTitle: 'Breakfast',
            slotTime: '8:30 AM',
            primaryMeal: {
              id: 'w-v-l-b1',
              name: 'Sprouted Moong & Paneer Poha',
              description: 'Light flaked rice cooked with steamed sprouted beans, low-fat paneer cubes, and crunchy peanuts.',
              calories: 360,
              protein: 18,
              carbs: 48,
              fat: 9,
              prepTimeMinutes: 15,
              veggies: ['Green Chillies', 'Curry Leaves', 'Onions', 'Lemon']
            },
            alternativeOptions: [
              {
                id: 'w-v-l-b2',
                name: 'Oats & Spinach Cheela with Mint Chutney',
                description: 'Savory rolled oats pancake blended with fresh spinach, grated ginger, and cumin seeds.',
                calories: 330,
                protein: 15,
                carbs: 44,
                fat: 8,
                prepTimeMinutes: 12,
                veggies: ['Spinach', 'Green Chillies', 'Ginger']
              },
              {
                id: 'w-v-l-b3',
                name: 'Greek Yogurt Bowl with Berries & Chia',
                description: 'High-protein unflavored curd topped with fresh pomegranate, chia seeds, and a dash of cinnamon.',
                calories: 310,
                protein: 20,
                carbs: 34,
                fat: 6,
                prepTimeMinutes: 5,
                veggies: []
              }
            ]
          },
          {
            slotId: 'lunch',
            slotTitle: 'Lunch',
            slotTime: '1:30 PM',
            primaryMeal: {
              id: 'w-v-l-l1',
              name: 'Palak Tofu Bowl + Quinoa & Dal Tadka',
              description: 'Tender baby spinach gravy tossed with firm tofu, paired with boiled quinoa and yellow moong dal.',
              calories: 480,
              protein: 26,
              carbs: 62,
              fat: 12,
              prepTimeMinutes: 25,
              veggies: ['Spinach', 'Tomatoes', 'Garlic', 'Onions']
            },
            alternativeOptions: [
              {
                id: 'w-v-l-l2',
                name: '2 Multigrain Roti with Soya Chunk Curry',
                description: 'Protein-packed soya chunks simmered in aromatic tomato-onion broth with crisp cucumber salad.',
                calories: 460,
                protein: 28,
                carbs: 58,
                fat: 10,
                prepTimeMinutes: 20,
                veggies: ['Tomatoes', 'Onions', 'Cucumber']
              },
              {
                id: 'w-v-l-l3',
                name: 'Paneer & Bell Pepper Salad with Tahini',
                description: 'Pan-seared cottage cheese cubes with tri-color capsicum, baby cucumbers, and light lemon dressing.',
                calories: 440,
                protein: 24,
                carbs: 28,
                fat: 16,
                prepTimeMinutes: 15,
                veggies: ['Bell Peppers', 'Cucumber', 'Lemon']
              }
            ]
          },
          {
            slotId: 'snack',
            slotTitle: 'Evening Snack',
            slotTime: '5:00 PM',
            primaryMeal: {
              id: 'w-v-l-s1',
              name: 'Roasted Makhana & Green Tea',
              description: 'Fox nuts lightly toasted in olive oil with rock salt and black pepper.',
              calories: 140,
              protein: 4,
              carbs: 22,
              fat: 4,
              prepTimeMinutes: 5,
              veggies: []
            },
            alternativeOptions: [
              {
                id: 'w-v-l-s2',
                name: 'Spiced Buttermilk (Chaas) + 8 Almonds',
                description: 'Fresh churned cooling yogurt drink tempered with roasted cumin, rock salt, and mint.',
                calories: 120,
                protein: 5,
                carbs: 10,
                fat: 6,
                prepTimeMinutes: 5,
                veggies: ['Mint Leaves', 'Ginger']
              }
            ]
          },
          {
            slotId: 'dinner',
            slotTitle: 'Dinner (Light & Early)',
            slotTime: '8:00 PM',
            primaryMeal: {
              id: 'w-v-l-d1',
              name: 'Grilled Vegetable & Paneer Skewers + Tomato Soup',
              description: 'Charred zucchini, bell peppers, and paneer with herbs alongside a warm, soothing homemade tomato broth.',
              calories: 380,
              protein: 22,
              carbs: 28,
              fat: 14,
              prepTimeMinutes: 20,
              veggies: ['Zucchini', 'Bell Peppers', 'Tomatoes', 'Garlic']
            },
            alternativeOptions: [
              {
                id: 'w-v-l-d2',
                name: 'Lauki Moong Dal Khichdi + Curd',
                description: 'Easy-to-digest comfort bowl of broken brown rice, yellow lentils, and grated bottle gourd.',
                calories: 360,
                protein: 16,
                carbs: 52,
                fat: 7,
                prepTimeMinutes: 20,
                veggies: ['Bottle Gourd (Lauki)', 'Tomatoes']
              }
            ]
          }
        ]
      },
      Monday: generateDefaultLossVegPlan('Monday', 'Metabolic Kickstart'),
      Tuesday: generateDefaultLossVegPlan('Tuesday', 'Protein Power Day'),
      Thursday: generateDefaultLossVegPlan('Thursday', 'Fiber Fuel Day'),
      Friday: generateDefaultLossVegPlan('Friday', 'Detox & Lean Digest'),
      Saturday: generateDefaultLossVegPlan('Saturday', 'Endurance Balance'),
      Sunday: generateDefaultLossVegPlan('Sunday', 'Rest & Rejuvenation')
    },
    nonveg: {
      Wednesday: {
        day: 'Wednesday',
        tagline: 'Lean Protein & Fat Burner',
        totalCalories: 1590,
        totalProtein: 112,
        totalCarbs: 135,
        totalFat: 44,
        todayVeggies: [
          { name: 'Baby Spinach', category: 'Leafy Green' },
          { name: 'Cherry / Vine Tomatoes', category: 'Base' },
          { name: 'Broccoli Florets', category: 'Cruciferous' },
          { name: 'Bell Peppers', category: 'Veggies' },
          { name: 'Cucumber & Carrots', category: 'Crunch' },
          { name: 'Garlic & Lemon', category: 'Aromatics' }
        ],
        meals: [
          {
            slotId: 'breakfast',
            slotTitle: 'Breakfast',
            slotTime: '8:30 AM',
            primaryMeal: {
              id: 'w-nv-l-b1',
              name: '3 Egg Whites + 1 Whole Egg Scramble with Spinach',
              description: 'Fluffy eggs scrambled with baby spinach, onions, and black pepper, served with 1 slice sourdough toast.',
              calories: 340,
              protein: 26,
              carbs: 24,
              fat: 11,
              prepTimeMinutes: 10,
              veggies: ['Spinach', 'Onions', 'Green Chillies']
            },
            alternativeOptions: [
              {
                id: 'w-nv-l-b2',
                name: 'Boiled Egg Chaat with Chickpeas & Tomatoes',
                description: '3 hard-boiled egg whites diced with boiled kabuli chana, chopped onions, and lemon zest.',
                calories: 320,
                protein: 24,
                carbs: 32,
                fat: 6,
                prepTimeMinutes: 8,
                veggies: ['Tomatoes', 'Onions', 'Lemon', 'Coriander']
              }
            ]
          },
          {
            slotId: 'lunch',
            slotTitle: 'Lunch',
            slotTime: '1:30 PM',
            primaryMeal: {
              id: 'w-nv-l-l1',
              name: 'Grilled Herb Chicken Breast + Brown Rice & Steamed Broccoli',
              description: '150g marinated tender chicken breast grilled with rosemary, paired with 1 cup brown rice and crunchy greens.',
              calories: 520,
              protein: 44,
              carbs: 52,
              fat: 12,
              prepTimeMinutes: 25,
              veggies: ['Broccoli', 'Bell Peppers', 'Garlic', 'Lemon']
            },
            alternativeOptions: [
              {
                id: 'w-nv-l-l2',
                name: 'Flaked Fish Tikka with Mint Rice',
                description: 'Steamed white fish fillet flavored with carom seeds and yogurt, served with cucumber salad.',
                calories: 490,
                protein: 42,
                carbs: 48,
                fat: 10,
                prepTimeMinutes: 20,
                veggies: ['Cucumber', 'Mint', 'Lemon']
              }
            ]
          },
          {
            slotId: 'snack',
            slotTitle: 'Evening Snack',
            slotTime: '5:00 PM',
            primaryMeal: {
              id: 'w-nv-l-s1',
              name: '2 Boiled Egg Whites + Black Coffee or Green Tea',
              description: 'Clean lean protein hit with mineral-rich pink Himalayan rock salt.',
              calories: 120,
              protein: 12,
              carbs: 2,
              fat: 2,
              prepTimeMinutes: 5,
              veggies: []
            },
            alternativeOptions: [
              {
                id: 'w-nv-l-s2',
                name: 'Roasted Edamame / Chana Bowl',
                description: 'Crunchy salted roasted legumes for steady satiety.',
                calories: 140,
                protein: 9,
                carbs: 18,
                fat: 3,
                prepTimeMinutes: 2,
                veggies: []
              }
            ]
          },
          {
            slotId: 'dinner',
            slotTitle: 'Dinner',
            slotTime: '8:00 PM',
            primaryMeal: {
              id: 'w-nv-l-d1',
              name: 'Clear Chicken & Vegetable Soup with Sautéed Greens',
              description: 'Simmered slow-cooked chicken broth with shredded chicken, carrots, celery, and ginger.',
              calories: 360,
              protein: 34,
              carbs: 18,
              fat: 11,
              prepTimeMinutes: 20,
              veggies: ['Carrots', 'Celery', 'Ginger', 'Beans']
            },
            alternativeOptions: [
              {
                id: 'w-nv-l-d2',
                name: 'Grilled Fish with Stir-fried Bell Peppers',
                description: 'Pan-seared river sole or basa fillet with garlic-tossed capsicum and lemon butter drizzle.',
                calories: 380,
                protein: 36,
                carbs: 12,
                fat: 14,
                prepTimeMinutes: 18,
                veggies: ['Bell Peppers', 'Garlic', 'Lemon']
              }
            ]
          }
        ]
      },
      Monday: generateDefaultLossNonVegPlan('Monday', 'High Protein Launch'),
      Tuesday: generateDefaultLossNonVegPlan('Tuesday', 'Lean Muscle Deficit'),
      Thursday: generateDefaultLossNonVegPlan('Thursday', 'Clean Carb Balance'),
      Friday: generateDefaultLossNonVegPlan('Friday', 'Omega-3 Focus'),
      Saturday: generateDefaultLossNonVegPlan('Saturday', 'Active Recovery Fuel'),
      Sunday: generateDefaultLossNonVegPlan('Sunday', 'Nutrient Recharge')
    },
    both: {
      Wednesday: {
        day: 'Wednesday',
        tagline: 'Balanced High-Protein Veg & Non-Veg Deficit',
        totalCalories: 1560,
        totalProtein: 105,
        totalCarbs: 140,
        totalFat: 42,
        todayVeggies: [
          { name: 'Fresh Spinach (Palak)', category: 'Leafy Green' },
          { name: 'Red Tomatoes', category: 'Base' },
          { name: 'Cucumbers', category: 'Salad' },
          { name: 'Green Bell Peppers', category: 'Veggies' },
          { name: 'Broccoli Florets', category: 'Cruciferous' },
          { name: 'Ginger & Garlic', category: 'Aromatics' },
          { name: 'Fresh Lemon & Mint', category: 'Garnish' }
        ],
        meals: [
          {
            slotId: 'breakfast',
            slotTitle: 'Breakfast',
            slotTime: '8:30 AM',
            primaryMeal: {
              id: 'w-b-l-b1',
              name: '3 Boiled Eggs & Whole Grain Toast',
              description: 'Farm eggs with whole wheat toast, or light sprouted moong flaked rice with roasted peanuts.',
              calories: 340,
              protein: 22,
              carbs: 26,
              fat: 10,
              prepTimeMinutes: 12,
              veggies: ['Green Chillies', 'Curry Leaves', 'Lemon']
            },
            alternativeOptions: [
              {
                id: 'w-b-l-b2',
                name: 'Vegetable Oats Upma with Peanuts',
                description: 'Steel-cut oats dry roasted with diced carrots, peas, and roasted mustard seeds (Pure Veg).',
                calories: 330,
                protein: 14,
                carbs: 46,
                fat: 8,
                prepTimeMinutes: 12,
                veggies: ['Carrots', 'Green Peas', 'Ginger']
              },
              {
                id: 'w-b-l-b3',
                name: '3 Egg Omelet with Spinach & Feta',
                description: 'Fluffy whole egg scramble loaded with fresh baby spinach and pepper (Non-Veg).',
                calories: 340,
                protein: 26,
                carbs: 6,
                fat: 18,
                prepTimeMinutes: 10,
                veggies: ['Spinach', 'Mushrooms', 'Onions']
              }
            ]
          },
          {
            slotId: 'lunch',
            slotTitle: 'Lunch',
            slotTime: '1:30 PM',
            primaryMeal: {
              id: 'w-b-l-l1',
              name: 'Grilled Herb Chicken (160g) + 2 Roti & Salad',
              description: 'Tender lean breast or fresh paneer with warm whole wheat flatbread and cucumber salad.',
              calories: 520,
              protein: 44,
              carbs: 48,
              fat: 12,
              prepTimeMinutes: 22,
              veggies: ['Bell Peppers', 'Onions', 'Cucumbers']
            },
            alternativeOptions: [
              {
                id: 'w-b-l-l2',
                name: '2 Jowar Roti + Mix Veg Sabzi + Dal Tadka',
                description: 'Gluten-free sorghum rotis paired with seasonal vegetables and yellow dal (Pure Veg).',
                calories: 480,
                protein: 24,
                carbs: 65,
                fat: 10,
                prepTimeMinutes: 25,
                veggies: ['Cauliflower', 'Beans', 'Tomatoes']
              },
              {
                id: 'w-b-l-l3',
                name: 'Chicken Tikka Wrap in Lettuce Cups',
                description: 'Tandoori spiced chicken breast wrapped in crisp iceberg lettuce with mint yogurt (Non-Veg).',
                calories: 460,
                protein: 42,
                carbs: 14,
                fat: 12,
                prepTimeMinutes: 20,
                veggies: ['Lettuce', 'Cucumbers', 'Onions']
              }
            ]
          },
          {
            slotId: 'snack',
            slotTitle: 'Snack',
            slotTime: '5:00 PM',
            primaryMeal: {
              id: 'w-b-l-s1',
              name: 'Sprouted Moong Salad & Boiled Egg',
              description: 'Crunchy sprouted green gram tossed with diced onions, tomatoes, and egg.',
              calories: 160,
              protein: 12,
              carbs: 20,
              fat: 3,
              prepTimeMinutes: 5,
              veggies: ['Onions', 'Lemon', 'Tomatoes']
            },
            alternativeOptions: [
              {
                id: 'w-b-l-s2',
                name: 'Roasted Makhana with Green Tea',
                description: 'Air-popped fox nuts lightly toasted with pinch of pink salt and black pepper (Veg).',
                calories: 120,
                protein: 4,
                carbs: 20,
                fat: 2,
                prepTimeMinutes: 3,
                veggies: []
              },
              {
                id: 'w-b-l-s3',
                name: 'Whey Protein Shake with Water',
                description: 'Rapid-absorbing micro-filtered whey protein isolate for lean muscle synthesis (Quick).',
                calories: 130,
                protein: 25,
                carbs: 2,
                fat: 1,
                prepTimeMinutes: 2,
                veggies: []
              }
            ]
          },
          {
            slotId: 'dinner',
            slotTitle: 'Dinner',
            slotTime: '8:00 PM',
            primaryMeal: {
              id: 'w-b-l-d1',
              name: 'Pan-Seared Fish or Paneer & Broccoli Stir Fry',
              description: 'White fish or cottage cheese tossed with garlic broccoli and clear hot vegetable soup.',
              calories: 380,
              protein: 34,
              carbs: 20,
              fat: 12,
              prepTimeMinutes: 18,
              veggies: ['Broccoli', 'Garlic', 'Capsicum']
            },
            alternativeOptions: [
              {
                id: 'w-b-l-d2',
                name: 'Tofu & Mushroom Garlic Stir Fry',
                description: 'Firm organic tofu sauteed with button mushrooms, bell peppers, and sesame (Veg).',
                calories: 320,
                protein: 20,
                carbs: 18,
                fat: 10,
                prepTimeMinutes: 15,
                veggies: ['Mushrooms', 'Zucchini', 'Garlic']
              },
              {
                id: 'w-b-l-d3',
                name: 'Chicken Bone Broth Soup with Shredded Breast',
                description: 'Slow-simmered chicken soup with carrots, shredded breast, ginger, and herbs (Non-Veg).',
                calories: 340,
                protein: 38,
                carbs: 12,
                fat: 8,
                prepTimeMinutes: 25,
                veggies: ['Carrots', 'Celery', 'Ginger']
              }
            ]
          }
        ]
      },
      Monday: generateDefaultLossBothPlan('Monday', 'Metabolic Kickstart (Veg + Non-Veg)'),
      Tuesday: generateDefaultLossBothPlan('Tuesday', 'Lean Muscle Deficit & Clean Greens'),
      Thursday: generateDefaultLossBothPlan('Thursday', 'Fiber & Protein Synergy'),
      Friday: generateDefaultLossBothPlan('Friday', 'Omega-3 & Antioxidant Charge'),
      Saturday: generateDefaultLossBothPlan('Saturday', 'Active Weekend Nutrition'),
      Sunday: generateDefaultLossBothPlan('Sunday', 'Full Body System Reset')
    }
  },
  gain: {
    veg: {
      Wednesday: {
        day: 'Wednesday',
        tagline: 'Clean Surplus & Hypertrophy Fuel',
        totalCalories: 2650,
        totalProtein: 124,
        totalCarbs: 340,
        totalFat: 74,
        todayVeggies: [
          { name: 'Potatoes (Aloo) & Sweet Potatoes', category: 'Roots' },
          { name: 'Green Peas (Matar)', category: 'Legumes' },
          { name: 'Tomatoes & Red Onions', category: 'Gravy Base' },
          { name: 'Spinach & Methi', category: 'Greens' },
          { name: 'Garlic, Ginger & Green Chillies', category: 'Spices' },
          { name: 'Coriander Leaves', category: 'Garnish' }
        ],
        meals: [
          {
            slotId: 'breakfast',
            slotTitle: 'Heavy Power Breakfast',
            slotTime: '8:00 AM',
            primaryMeal: {
              id: 'w-v-g-b1',
              name: '2 Stuffed Paneer Parathas + Curd + Banana Shake',
              description: 'Whole wheat flatbread stuffed with fresh cottage cheese, served with thick curd and a creamy banana-oat smoothie.',
              calories: 720,
              protein: 32,
              carbs: 95,
              fat: 22,
              prepTimeMinutes: 20,
              veggies: ['Green Chillies', 'Coriander', 'Onions']
            },
            alternativeOptions: [
              {
                id: 'w-v-g-b2',
                name: 'Oats & Peanut Butter Bowl + 100g Tofu Bhurji',
                description: 'Warm milk oats loaded with 2 spoons peanut butter, chia seeds, and scrambled spiced tofu.',
                calories: 680,
                protein: 34,
                carbs: 84,
                fat: 24,
                prepTimeMinutes: 12,
                veggies: ['Tomatoes', 'Onions']
              }
            ]
          },
          {
            slotId: 'lunch',
            slotTitle: 'High Calorie Mass Lunch',
            slotTime: '1:30 PM',
            primaryMeal: {
              id: 'w-v-g-l1',
              name: 'Paneer Butter Bhurji + 3 Roti + Dal Makhani + Basmati Rice',
              description: '150g rich paneer bhurji prepared with ghee and fresh tomatoes, thick black lentils, and whole wheat rotis.',
              calories: 880,
              protein: 42,
              carbs: 110,
              fat: 28,
              prepTimeMinutes: 30,
              veggies: ['Tomatoes', 'Onions', 'Garlic', 'Green Peas']
            },
            alternativeOptions: [
              {
                id: 'w-v-g-l2',
                name: 'Soya & Chana Biryani with Raita',
                description: 'Fragrant basmati rice layered with seasoned soya chunks and chickpeas, accompanied by cucumber raita.',
                calories: 820,
                protein: 38,
                carbs: 118,
                fat: 20,
                prepTimeMinutes: 25,
                veggies: ['Onions', 'Tomatoes', 'Mint', 'Cucumber']
              }
            ]
          },
          {
            slotId: 'snack',
            slotTitle: 'Pre/Post Workout Energy',
            slotTime: '5:30 PM',
            primaryMeal: {
              id: 'w-v-g-s1',
              name: 'Peanut Butter Toast (2 slices) + Roasted Chickpeas',
              description: 'Multigrain bread slathered with crunchy peanut butter, honey, and salted roasted chana.',
              calories: 380,
              protein: 16,
              carbs: 48,
              fat: 14,
              prepTimeMinutes: 5,
              veggies: []
            },
            alternativeOptions: [
              {
                id: 'w-v-g-s2',
                name: 'Paneer Sandwich + Dry Fruit Ladoo',
                description: 'Toasted whole wheat sandwich with grated paneer and oregano, accompanied by almond-date energy bite.',
                calories: 410,
                protein: 18,
                carbs: 52,
                fat: 16,
                prepTimeMinutes: 10,
                veggies: ['Tomatoes', 'Cucumber']
              }
            ]
          },
          {
            slotId: 'dinner',
            slotTitle: 'Night Recovery Dinner',
            slotTime: '8:30 PM',
            primaryMeal: {
              id: 'w-v-g-d1',
              name: 'Rajma Masala + Jeera Rice + 2 Roti + Salad',
              description: 'Hearty kidney bean stew rich in potassium and complex carbohydrates, served with cumin tempered rice.',
              calories: 670,
              protein: 34,
              carbs: 102,
              fat: 16,
              prepTimeMinutes: 25,
              veggies: ['Tomatoes', 'Onions', 'Ginger', 'Cucumber']
            },
            alternativeOptions: [
              {
                id: 'w-v-g-d2',
                name: 'Matar Paneer with 3 Ghee Rotis & Sprout Salad',
                description: 'Succulent cottage cheese cubes and sweet green peas simmered in rich tomato gravy.',
                calories: 650,
                protein: 32,
                carbs: 88,
                fat: 22,
                prepTimeMinutes: 25,
                veggies: ['Green Peas', 'Tomatoes', 'Onions']
              }
            ]
          }
        ]
      },
      Monday: generateDefaultGainVegPlan('Monday', 'Anabolic Foundation'),
      Tuesday: generateDefaultGainVegPlan('Tuesday', 'Glycogen Replenish'),
      Thursday: generateDefaultGainVegPlan('Thursday', 'Strength Surge'),
      Friday: generateDefaultGainVegPlan('Friday', 'Mass Acceleration'),
      Saturday: generateDefaultGainVegPlan('Saturday', 'Peak Power Fuel'),
      Sunday: generateDefaultGainVegPlan('Sunday', 'Rest & Synthesis')
    },
    nonveg: {
      Wednesday: {
        day: 'Wednesday',
        tagline: 'High Calorie & Hypertrophy Beast Plan',
        totalCalories: 2850,
        totalProtein: 168,
        totalCarbs: 320,
        totalFat: 82,
        todayVeggies: [
          { name: 'Red Onions & Ripe Tomatoes', category: 'Gravy Base' },
          { name: 'Potatoes (Aloo)', category: 'Carb Source' },
          { name: 'Green Bell Peppers', category: 'Veggies' },
          { name: 'Ginger-Garlic Paste', category: 'Aromatics' },
          { name: 'Fresh Coriander', category: 'Garnish' },
          { name: 'Cucumbers & Lemon', category: 'Salad' }
        ],
        meals: [
          {
            slotId: 'breakfast',
            slotTitle: 'Champion Breakfast',
            slotTime: '8:00 AM',
            primaryMeal: {
              id: 'w-nv-g-b1',
              name: '4 Whole Eggs Omelet + 3 Multigrain Toast + Mango/Banana Milkshake',
              description: 'Hearty 4-egg omelet loaded with diced onions, tomatoes, and cheddar cheese, with calorie-dense fruit shake.',
              calories: 780,
              protein: 45,
              carbs: 82,
              fat: 28,
              prepTimeMinutes: 15,
              veggies: ['Onions', 'Tomatoes', 'Green Chillies']
            },
            alternativeOptions: [
              {
                id: 'w-nv-g-b2',
                name: 'Scrambled Eggs with Sautéed Sausages & Hashbrown',
                description: 'Fluffy eggs with chicken sausages, grilled hash browns, and whole wheat toast.',
                calories: 740,
                protein: 42,
                carbs: 76,
                fat: 29,
                prepTimeMinutes: 15,
                veggies: ['Onions', 'Garlic']
              }
            ]
          },
          {
            slotId: 'lunch',
            slotTitle: 'Power Mass Lunch',
            slotTime: '1:30 PM',
            primaryMeal: {
              id: 'w-nv-g-l1',
              name: 'Homestyle Chicken Curry (250g) + 3 Ghee Roti + Basmati Rice',
              description: 'Juicy chicken pieces stewed in rich, aromatic onion-tomato curry, served with warm chapatis and rice.',
              calories: 940,
              protein: 62,
              carbs: 105,
              fat: 26,
              prepTimeMinutes: 30,
              veggies: ['Onions', 'Tomatoes', 'Ginger', 'Garlic']
            },
            alternativeOptions: [
              {
                id: 'w-nv-g-l2',
                name: 'Tender Mutton / Fish Curry + Jeera Rice',
                description: 'Slow-cooked flavorful meat curry packed with iron, creatine, and protein.',
                calories: 910,
                protein: 58,
                carbs: 98,
                fat: 32,
                prepTimeMinutes: 35,
                veggies: ['Onions', 'Tomatoes', 'Garlic']
              }
            ]
          },
          {
            slotId: 'snack',
            slotTitle: 'Pre-Workout Fuel',
            slotTime: '5:30 PM',
            primaryMeal: {
              id: 'w-nv-g-s1',
              name: '3 Boiled Eggs + 2 Peanut Butter Sandwiches',
              description: 'Hard boiled eggs paired with wholesome whole-grain peanut butter toast for sustained workout stamina.',
              calories: 460,
              protein: 28,
              carbs: 46,
              fat: 16,
              prepTimeMinutes: 8,
              veggies: []
            },
            alternativeOptions: [
              {
                id: 'w-nv-g-s2',
                name: 'Chicken Tikka Sandwich + Banana',
                description: 'Shredded roasted chicken breast layered in crusty bread with light mustard and crisp greens.',
                calories: 480,
                protein: 34,
                carbs: 52,
                fat: 14,
                prepTimeMinutes: 10,
                veggies: ['Cucumber', 'Lettuce']
              }
            ]
          },
          {
            slotId: 'dinner',
            slotTitle: 'Hypertrophic Dinner',
            slotTime: '8:30 PM',
            primaryMeal: {
              id: 'w-nv-g-d1',
              name: 'Grilled Herb Chicken (200g) + Mashed Potatoes & Sautéed Beans',
              description: 'Generous chicken breast grilled in olive oil with buttery rustic mashed potatoes and steamed French beans.',
              calories: 670,
              protein: 58,
              carbs: 62,
              fat: 20,
              prepTimeMinutes: 25,
              veggies: ['Potatoes', 'French Beans', 'Garlic']
            },
            alternativeOptions: [
              {
                id: 'w-nv-g-d2',
                name: 'Egg Bhurji (4 Eggs) with 3 Rotis & Dal',
                description: 'Spiced Indian egg scramble with bell peppers, accompanied by warm rotis and yellow lentils.',
                calories: 650,
                protein: 44,
                carbs: 70,
                fat: 22,
                prepTimeMinutes: 20,
                veggies: ['Bell Peppers', 'Tomatoes', 'Onions']
              }
            ]
          }
        ]
      },
      Monday: generateDefaultGainNonVegPlan('Monday', 'Heavy Lifting Foundation'),
      Tuesday: generateDefaultGainNonVegPlan('Tuesday', 'Protein Saturation'),
      Thursday: generateDefaultGainNonVegPlan('Thursday', 'Strength Catalyst'),
      Friday: generateDefaultGainNonVegPlan('Friday', 'Hypertrophy Surge'),
      Saturday: generateDefaultGainNonVegPlan('Saturday', 'Peak Recovery Intake'),
      Sunday: generateDefaultGainNonVegPlan('Sunday', 'Full System Rebuild')
    },
    both: {
      Wednesday: {
        day: 'Wednesday',
        tagline: 'Optimal Caloric Surplus with Veg & Non-Veg Synergy',
        totalCalories: 2720,
        totalProtein: 155,
        totalCarbs: 320,
        totalFat: 78,
        todayVeggies: [
          { name: 'Potatoes & Sweet Potatoes', category: 'Roots' },
          { name: 'Tomatoes & Red Onions', category: 'Base' },
          { name: 'Green Peas & French Beans', category: 'Legumes' },
          { name: 'Bell Peppers', category: 'Veggies' },
          { name: 'Ginger, Garlic & Green Chillies', category: 'Aromatics' }
        ],
        meals: [
          {
            slotId: 'breakfast',
            slotTitle: 'Heavy Breakfast',
            slotTime: '8:00 AM',
            primaryMeal: {
              id: 'w-b-g-b1',
              name: '4 Eggs Scramble + 3 Toast + Peanut Butter Shake',
              description: 'Whole eggs cooked with onions and tomatoes, high-fiber toast, and calorie-dense smoothie.',
              calories: 740,
              protein: 42,
              carbs: 76,
              fat: 26,
              prepTimeMinutes: 15,
              veggies: ['Onions', 'Tomatoes']
            },
            alternativeOptions: [
              {
                id: 'w-b-g-b2',
                name: 'Oats with Peanut Butter, Milk & Dry Fruits',
                description: 'Rolled oats cooked in whole milk with generous peanut butter and crushed almonds (Veg).',
                calories: 680,
                protein: 30,
                carbs: 88,
                fat: 22,
                prepTimeMinutes: 10,
                veggies: []
              },
              {
                id: 'w-b-g-b3',
                name: 'Chicken Kheema with 2 Pav/Buns',
                description: 'Lean minced chicken cooked in roasted spices served with toasted butter buns (Non-Veg).',
                calories: 690,
                protein: 40,
                carbs: 62,
                fat: 26,
                prepTimeMinutes: 20,
                veggies: ['Tomatoes', 'Green Peas']
              }
            ]
          },
          {
            slotId: 'lunch',
            slotTitle: 'Lunch',
            slotTime: '1:30 PM',
            primaryMeal: {
              id: 'w-b-g-l1',
              name: 'Homestyle Chicken Curry (200g) + 3 Roti + Rice',
              description: 'Juicy chicken drumsticks or paneer in aromatic gravy with wheat rotis and basmati rice.',
              calories: 900,
              protein: 56,
              carbs: 104,
              fat: 24,
              prepTimeMinutes: 30,
              veggies: ['Onions', 'Tomatoes', 'Garlic']
            },
            alternativeOptions: [
              {
                id: 'w-b-g-l2',
                name: 'Rajma Chawal + Paneer Tikka + Green Salad',
                description: 'Slow-simmered kidney bean curry with steamed rice and grilled paneer cubes (Veg).',
                calories: 890,
                protein: 38,
                carbs: 115,
                fat: 22,
                prepTimeMinutes: 30,
                veggies: ['Tomatoes', 'Onions']
              },
              {
                id: 'w-b-g-l3',
                name: 'Chicken Biryani + Egg Raita + Salad',
                description: 'Fragrant chicken dum biryani served with boiled egg raita and onions (Non-Veg).',
                calories: 940,
                protein: 58,
                carbs: 110,
                fat: 26,
                prepTimeMinutes: 35,
                veggies: ['Mint', 'Onions', 'Cucumbers']
              }
            ]
          },
          {
            slotId: 'snack',
            slotTitle: 'Snack',
            slotTime: '5:30 PM',
            primaryMeal: {
              id: 'w-b-g-s1',
              name: 'Chicken / Paneer Sandwich + Fresh Banana',
              description: 'Toasted whole wheat sandwich with chicken breast or fresh paneer slices and a banana.',
              calories: 440,
              protein: 28,
              carbs: 48,
              fat: 14,
              prepTimeMinutes: 8,
              veggies: ['Cucumber', 'Lettuce']
            },
            alternativeOptions: [
              {
                id: 'w-b-g-s2',
                name: 'Peanut Butter Banana Toast (2) + Warm Milk',
                description: 'Crisp sourdough with crunchy peanut butter, banana discs, and honey drizzle (Veg).',
                calories: 460,
                protein: 18,
                carbs: 62,
                fat: 16,
                prepTimeMinutes: 5,
                veggies: []
              },
              {
                id: 'w-b-g-s3',
                name: 'Double Egg Mayo Sandwich with Boiled Eggs',
                description: 'Whole wheat bread packed with seasoned egg scramble and boiled eggs (Non-Veg).',
                calories: 430,
                protein: 26,
                carbs: 38,
                fat: 18,
                prepTimeMinutes: 8,
                veggies: ['Lettuce']
              }
            ]
          },
          {
            slotId: 'dinner',
            slotTitle: 'Dinner',
            slotTime: '8:30 PM',
            primaryMeal: {
              id: 'w-b-g-d1',
              name: 'Grilled Chicken or Paneer Butter Masala + 3 Parathas',
              description: 'Lean grilled protein or rich paneer gravy with flaky whole wheat parathas and curd.',
              calories: 640,
              protein: 48,
              carbs: 68,
              fat: 18,
              prepTimeMinutes: 25,
              veggies: ['Potatoes', 'French Beans', 'Garlic']
            },
            alternativeOptions: [
              {
                id: 'w-b-g-d2',
                name: 'Chole Masala + 3 Parathas + Curd',
                description: 'Rich chickpeas in aromatic spices with wheat flatbreads and probiotic curd (Veg).',
                calories: 660,
                protein: 32,
                carbs: 98,
                fat: 16,
                prepTimeMinutes: 25,
                veggies: ['Tomatoes', 'Onions', 'Ginger']
              },
              {
                id: 'w-b-g-d3',
                name: 'Grilled Fish Steak + Mashed Potatoes + Greens',
                description: 'Seasoned white fish fillet with garlic potato mash and steamed greens (Non-Veg).',
                calories: 670,
                protein: 52,
                carbs: 62,
                fat: 18,
                prepTimeMinutes: 25,
                veggies: ['Garlic', 'Green Beans']
              }
            ]
          }
        ]
      },
      Monday: generateDefaultGainBothPlan('Monday', 'Maximum Hypertrophy Launch (Veg + Non-Veg)'),
      Tuesday: generateDefaultGainBothPlan('Tuesday', 'Protein Saturation & Caloric Surge'),
      Thursday: generateDefaultGainBothPlan('Thursday', 'Strength Output Optimization'),
      Friday: generateDefaultGainBothPlan('Friday', 'Weekend Pre-Burn Surge'),
      Saturday: generateDefaultGainBothPlan('Saturday', 'Peak Recovery Intake & Synthesis'),
      Sunday: generateDefaultGainBothPlan('Sunday', 'Full System Anabolic Rebuild')
    }
  }
};

function generateDefaultLossVegPlan(day: DayOfWeek, tagline: string): DayDietPlan {
  return {
    day,
    tagline,
    totalCalories: 1520,
    totalProtein: 75,
    totalCarbs: 160,
    totalFat: 40,
    todayVeggies: [
      { name: 'Spinach & Methi', category: 'Leafy Greens' },
      { name: 'Cucumbers', category: 'Salad' },
      { name: 'Tomatoes', category: 'Base' },
      { name: 'Cauliflower / Broccoli', category: 'Cruciferous' },
      { name: 'Ginger & Garlic', category: 'Aromatics' }
    ],
    meals: [
      {
        slotId: 'breakfast',
        slotTitle: 'Breakfast',
        slotTime: '8:30 AM',
        primaryMeal: {
          id: `${day}-lv-b1`,
          name: 'Vegetable Oats Upma with Peanuts',
          description: 'Steel-cut oats dry roasted with diced carrots, peas, and roasted mustard seeds.',
          calories: 340,
          protein: 14,
          carbs: 46,
          fat: 8,
          prepTimeMinutes: 12,
          veggies: ['Carrots', 'Green Peas', 'Ginger']
        },
        alternativeOptions: [
          {
            id: `${day}-lv-b2`,
            name: 'Besan Chilla with Mint Chutney',
            description: 'Gram flour savory pancake studded with onions, tomatoes, and coriander.',
            calories: 310,
            protein: 13,
            carbs: 38,
            fat: 9,
            prepTimeMinutes: 10,
            veggies: ['Tomatoes', 'Coriander', 'Green Chilies']
          },
          {
            id: `${day}-lv-b3`,
            name: 'Moong Dal Idli with Sambar',
            description: 'Fermented yellow lentil steamed cakes served with nutrient-dense vegetable sambar.',
            calories: 290,
            protein: 14,
            carbs: 48,
            fat: 4,
            prepTimeMinutes: 15,
            veggies: ['Drumsticks', 'Carrots', 'Tomatoes']
          }
        ]
      },
      {
        slotId: 'lunch',
        slotTitle: 'Lunch',
        slotTime: '1:30 PM',
        primaryMeal: {
          id: `${day}-lv-l1`,
          name: '2 Jowar Roti + Mix Veg Sabzi + Dal Tadka',
          description: 'Gluten-free sorghum rotis paired with seasonal vegetables and yellow dal.',
          calories: 480,
          protein: 24,
          carbs: 65,
          fat: 10,
          prepTimeMinutes: 25,
          veggies: ['Cauliflower', 'Beans', 'Tomatoes']
        },
        alternativeOptions: [
          {
            id: `${day}-lv-l2`,
            name: 'Brown Rice & Paneer Bhurji Bowl',
            description: 'Low-fat paneer crumbled with onions, bell peppers, and warm turmeric spices over brown rice.',
            calories: 490,
            protein: 26,
            carbs: 58,
            fat: 14,
            prepTimeMinutes: 20,
            veggies: ['Bell Peppers', 'Onions', 'Tomatoes']
          },
          {
            id: `${day}-lv-l3`,
            name: 'Quinoa Khichdi with Mixed Veggies',
            description: 'Protein-packed quinoa and yellow moong simmered with diced carrots, beans, and cumin.',
            calories: 440,
            protein: 18,
            carbs: 64,
            fat: 8,
            prepTimeMinutes: 22,
            veggies: ['Green Beans', 'Carrots', 'Green Peas']
          }
        ]
      },
      {
        slotId: 'snack',
        slotTitle: 'Snack',
        slotTime: '5:00 PM',
        primaryMeal: {
          id: `${day}-lv-s1`,
          name: 'Sprouted Moong Salad with Lemon',
          description: 'Crunchy sprouted green gram tossed with diced onions and chaat masala.',
          calories: 140,
          protein: 8,
          carbs: 22,
          fat: 1,
          prepTimeMinutes: 5,
          veggies: ['Onions', 'Lemon', 'Tomatoes']
        },
        alternativeOptions: [
          {
            id: `${day}-lv-s2`,
            name: 'Roasted Makhana with Green Tea',
            description: 'Air-popped fox nuts lightly toasted with pinch of pink salt and black pepper.',
            calories: 120,
            protein: 4,
            carbs: 20,
            fat: 2,
            prepTimeMinutes: 3,
            veggies: []
          },
          {
            id: `${day}-lv-s3`,
            name: 'Cucumber & Tomato Mint Chaat',
            description: 'Crisp English cucumber discs with Roma tomatoes, lemon squeeze, and rock salt.',
            calories: 80,
            protein: 2,
            carbs: 14,
            fat: 1,
            prepTimeMinutes: 5,
            veggies: ['Cucumber', 'Tomatoes', 'Mint']
          }
        ]
      },
      {
        slotId: 'dinner',
        slotTitle: 'Dinner',
        slotTime: '8:00 PM',
        primaryMeal: {
          id: `${day}-lv-d1`,
          name: 'Paneer & Broccoli Stir Fry + Clear Soup',
          description: 'Low-fat cottage cheese tossed with garlic broccoli and light soy seasoning.',
          calories: 360,
          protein: 22,
          carbs: 24,
          fat: 12,
          prepTimeMinutes: 15,
          veggies: ['Broccoli', 'Garlic', 'Capsicum']
        },
        alternativeOptions: [
          {
            id: `${day}-lv-d2`,
            name: 'Tofu & Mushroom Stir Fry',
            description: 'Firm organic tofu sauteed with button mushrooms, bell peppers, and sesame seeds.',
            calories: 320,
            protein: 20,
            carbs: 18,
            fat: 10,
            prepTimeMinutes: 15,
            veggies: ['Mushrooms', 'Zucchini', 'Garlic']
          },
          {
            id: `${day}-lv-d3`,
            name: 'Moong Dal Soup with Steamed Veggies',
            description: 'Light golden lentil broth paired with ginger steamed florets and zucchini.',
            calories: 300,
            protein: 18,
            carbs: 38,
            fat: 6,
            prepTimeMinutes: 20,
            veggies: ['Spinach', 'Bottle Gourd', 'Ginger']
          }
        ]
      }
    ]
  };
}

function generateDefaultLossNonVegPlan(day: DayOfWeek, tagline: string): DayDietPlan {
  return {
    day,
    tagline,
    totalCalories: 1580,
    totalProtein: 110,
    totalCarbs: 130,
    totalFat: 42,
    todayVeggies: [
      { name: 'Broccoli', category: 'Cruciferous' },
      { name: 'Bell Peppers', category: 'Veggies' },
      { name: 'Tomatoes', category: 'Base' },
      { name: 'Lettuce & Cucumber', category: 'Salad' }
    ],
    meals: [
      {
        slotId: 'breakfast',
        slotTitle: 'Breakfast',
        slotTime: '8:30 AM',
        primaryMeal: {
          id: `${day}-lnv-b1`,
          name: '3 Boiled Eggs + 1 Slice Whole Grain Toast',
          description: 'Clean whole eggs with a slice of high fiber bread and fresh orange slice.',
          calories: 320,
          protein: 24,
          carbs: 20,
          fat: 11,
          prepTimeMinutes: 10,
          veggies: []
        },
        alternativeOptions: [
          {
            id: `${day}-lnv-b2`,
            name: '3 Egg Omelet with Spinach & Feta',
            description: 'Fluffy whole egg scramble loaded with fresh baby spinach and crushed pepper.',
            calories: 340,
            protein: 26,
            carbs: 6,
            fat: 18,
            prepTimeMinutes: 10,
            veggies: ['Spinach', 'Mushrooms', 'Onions']
          },
          {
            id: `${day}-lnv-b3`,
            name: 'Greek Yogurt with Berries & Chia',
            description: 'Thick unflavored strained Greek yogurt topped with blueberries and chia seeds.',
            calories: 260,
            protein: 22,
            carbs: 24,
            fat: 6,
            prepTimeMinutes: 3,
            veggies: []
          }
        ]
      },
      {
        slotId: 'lunch',
        slotTitle: 'Lunch',
        slotTime: '1:30 PM',
        primaryMeal: {
          id: `${day}-lnv-l1`,
          name: 'Grilled Chicken (150g) + Steamed Brown Rice & Veggies',
          description: 'Juicy herb chicken served with steamed long-grain brown rice.',
          calories: 520,
          protein: 42,
          carbs: 50,
          fat: 12,
          prepTimeMinutes: 25,
          veggies: ['Bell Peppers', 'Broccoli']
        },
        alternativeOptions: [
          {
            id: `${day}-lnv-l2`,
            name: 'Chicken Tikka Wrap in Lettuce Cups',
            description: 'Tandoori spiced chicken breast wrapped in crisp iceberg lettuce with yogurt drizzle.',
            calories: 480,
            protein: 44,
            carbs: 16,
            fat: 14,
            prepTimeMinutes: 20,
            veggies: ['Lettuce', 'Cucumbers', 'Onions']
          },
          {
            id: `${day}-lnv-l3`,
            name: 'Tuna Salad with Olive Oil & Lemon',
            description: 'Flaked tuna tossed with cherry tomatoes, celery, capsicum, and cold pressed olive oil.',
            calories: 420,
            protein: 40,
            carbs: 12,
            fat: 16,
            prepTimeMinutes: 10,
            veggies: ['Tomatoes', 'Capsicum', 'Celery']
          }
        ]
      },
      {
        slotId: 'snack',
        slotTitle: 'Snack',
        slotTime: '5:00 PM',
        primaryMeal: {
          id: `${day}-lnv-s1`,
          name: 'Protein Shake or 2 Egg Whites',
          description: 'Quick post-afternoon protein replenishment.',
          calories: 140,
          protein: 24,
          carbs: 3,
          fat: 2,
          prepTimeMinutes: 3,
          veggies: []
        },
        alternativeOptions: [
          {
            id: `${day}-lnv-s2`,
            name: 'Hard Boiled Eggs (2) with Black Pepper',
            description: 'Simple clean egg whites or whole eggs with freshly cracked pepper.',
            calories: 150,
            protein: 13,
            carbs: 1,
            fat: 10,
            prepTimeMinutes: 8,
            veggies: []
          },
          {
            id: `${day}-lnv-s3`,
            name: 'Grilled Chicken Skewer (1)',
            description: 'Lean tender chicken breast skewered with bell peppers and onion wedges.',
            calories: 160,
            protein: 22,
            carbs: 2,
            fat: 4,
            prepTimeMinutes: 12,
            veggies: ['Bell Peppers']
          }
        ]
      },
      {
        slotId: 'dinner',
        slotTitle: 'Dinner',
        slotTime: '8:00 PM',
        primaryMeal: {
          id: `${day}-lnv-d1`,
          name: 'Pan-Seared Fish + Greek Salad',
          description: 'White fish seasoned with paprika and herbs alongside cucumber and tomato salad.',
          calories: 380,
          protein: 36,
          carbs: 14,
          fat: 13,
          prepTimeMinutes: 18,
          veggies: ['Cucumber', 'Tomatoes', 'Lemon']
        },
        alternativeOptions: [
          {
            id: `${day}-lnv-d2`,
            name: 'Chicken Bone Broth Soup with Veggies',
            description: 'Simmered slow-cooked chicken soup with carrots, shredded breast, and garlic.',
            calories: 340,
            protein: 38,
            carbs: 12,
            fat: 8,
            prepTimeMinutes: 25,
            veggies: ['Carrots', 'Celery', 'Ginger']
          },
          {
            id: `${day}-lnv-d3`,
            name: 'Grilled Salmon with Asparagus',
            description: 'Omega-3 rich salmon fillet pan seared with lemon butter and crisp asparagus spears.',
            calories: 410,
            protein: 36,
            carbs: 8,
            fat: 22,
            prepTimeMinutes: 18,
            veggies: ['Asparagus', 'Lemon']
          }
        ]
      }
    ]
  };
}

function generateDefaultGainVegPlan(day: DayOfWeek, tagline: string): DayDietPlan {
  return {
    day,
    tagline,
    totalCalories: 2600,
    totalProtein: 120,
    totalCarbs: 335,
    totalFat: 72,
    todayVeggies: [
      { name: 'Potatoes & Sweet Potatoes', category: 'Roots' },
      { name: 'Green Peas', category: 'Legumes' },
      { name: 'Tomatoes & Onions', category: 'Base' }
    ],
    meals: [
      {
        slotId: 'breakfast',
        slotTitle: 'Heavy Breakfast',
        slotTime: '8:00 AM',
        primaryMeal: {
          id: `${day}-gv-b1`,
          name: 'Oats with Peanut Butter, Milk & Dry Fruits',
          description: 'Warm rolled oats cooked in whole milk with peanut butter and soaked almonds.',
          calories: 680,
          protein: 30,
          carbs: 88,
          fat: 22,
          prepTimeMinutes: 10,
          veggies: []
        },
        alternativeOptions: [
          {
            id: `${day}-gv-b2`,
            name: 'Stuffed Paneer Parathas (2) with Curd',
            description: 'Generously stuffed cottage cheese flatbreads served with bowl of probiotic yogurt.',
            calories: 640,
            protein: 26,
            carbs: 82,
            fat: 20,
            prepTimeMinutes: 20,
            veggies: ['Onions', 'Coriander']
          },
          {
            id: `${day}-gv-b3`,
            name: 'High Calorie Banana Almond Shake + Sprouts',
            description: '2 bananas blended with milk, oats, whey protein, and peanut butter.',
            calories: 600,
            protein: 24,
            carbs: 86,
            fat: 18,
            prepTimeMinutes: 10,
            veggies: []
          }
        ]
      },
      {
        slotId: 'lunch',
        slotTitle: 'Lunch',
        slotTime: '1:30 PM',
        primaryMeal: {
          id: `${day}-gv-l1`,
          name: 'Paneer Masala + 3 Rotis + Dal Makhani + Rice',
          description: 'Cottage cheese cubes simmered in rich gravy with wheat rotis and rice.',
          calories: 860,
          protein: 40,
          carbs: 108,
          fat: 26,
          prepTimeMinutes: 30,
          veggies: ['Tomatoes', 'Onions', 'Garlic']
        },
        alternativeOptions: [
          {
            id: `${day}-gv-l2`,
            name: 'Rajma Chawal + Paneer Tikka + Green Salad',
            description: 'Rich red kidney bean curry with steamed aromatic rice and grilled spiced paneer.',
            calories: 890,
            protein: 38,
            carbs: 115,
            fat: 22,
            prepTimeMinutes: 30,
            veggies: ['Tomatoes', 'Onions']
          },
          {
            id: `${day}-gv-l3`,
            name: 'Kadhi Pakoda + Rice + Mix Veg Paratha',
            description: 'Traditional spiced gram flour kadhi with steamed rice and stuffed paratha.',
            calories: 820,
            protein: 28,
            carbs: 110,
            fat: 24,
            prepTimeMinutes: 35,
            veggies: ['Onions', 'Potatoes']
          }
        ]
      },
      {
        slotId: 'snack',
        slotTitle: 'Snack',
        slotTime: '5:30 PM',
        primaryMeal: {
          id: `${day}-gv-s1`,
          name: 'Paneer Sandwich + Banana',
          description: 'Grilled paneer toast with fresh banana.',
          calories: 400,
          protein: 18,
          carbs: 52,
          fat: 14,
          prepTimeMinutes: 8,
          veggies: ['Cucumber']
        },
        alternativeOptions: [
          {
            id: `${day}-gv-s2`,
            name: 'Peanut Butter Banana Toast (2) + Warm Milk',
            description: 'Whole wheat toast with thick peanut butter spread, sliced banana, and honey.',
            calories: 460,
            protein: 18,
            carbs: 62,
            fat: 16,
            prepTimeMinutes: 5,
            veggies: []
          },
          {
            id: `${day}-gv-s3`,
            name: 'Dry Fruit & Nut Granola Bar + Lassi',
            description: 'High energy seed & cashew bar paired with a glass of sweet lassi.',
            calories: 380,
            protein: 14,
            carbs: 50,
            fat: 12,
            prepTimeMinutes: 5,
            veggies: []
          }
        ]
      },
      {
        slotId: 'dinner',
        slotTitle: 'Dinner',
        slotTime: '8:30 PM',
        primaryMeal: {
          id: `${day}-gv-d1`,
          name: 'Chole Masala + 3 Parathas + Curd',
          description: 'Rich chickpeas in aromatic spices with wheat flatbreads.',
          calories: 660,
          protein: 32,
          carbs: 98,
          fat: 16,
          prepTimeMinutes: 25,
          veggies: ['Tomatoes', 'Onions', 'Ginger']
        },
        alternativeOptions: [
          {
            id: `${day}-gv-d2`,
            name: 'Paneer Butter Masala + 3 Garlic Naan + Rice',
            description: 'Creamy tomato paneer curry served with warm naan and cumin rice.',
            calories: 720,
            protein: 34,
            carbs: 96,
            fat: 20,
            prepTimeMinutes: 30,
            veggies: ['Tomatoes', 'Garlic']
          },
          {
            id: `${day}-gv-d3`,
            name: 'Soya Chunk Biryani + Boondi Raita',
            description: 'High protein textured soy simmered in spiced basmati rice with cold curd.',
            calories: 680,
            protein: 36,
            carbs: 98,
            fat: 16,
            prepTimeMinutes: 35,
            veggies: ['Onions', 'Mint', 'Beans']
          }
        ]
      }
    ]
  };
}

function generateDefaultGainNonVegPlan(day: DayOfWeek, tagline: string): DayDietPlan {
  return {
    day,
    tagline,
    totalCalories: 2800,
    totalProtein: 165,
    totalCarbs: 315,
    totalFat: 80,
    todayVeggies: [
      { name: 'Onions & Tomatoes', category: 'Base' },
      { name: 'Potatoes', category: 'Roots' },
      { name: 'Capsicum', category: 'Veggies' }
    ],
    meals: [
      {
        slotId: 'breakfast',
        slotTitle: 'Breakfast',
        slotTime: '8:00 AM',
        primaryMeal: {
          id: `${day}-gnv-b1`,
          name: '4 Eggs Omelet + 3 Toasts + Peanut Butter Shake',
          description: 'Fluffy whole egg scramble with toast and protein-packed smoothie.',
          calories: 760,
          protein: 44,
          carbs: 80,
          fat: 26,
          prepTimeMinutes: 15,
          veggies: ['Onions', 'Tomatoes']
        },
        alternativeOptions: [
          {
            id: `${day}-gnv-b2`,
            name: 'Scrambled Eggs (4) + Sausage + 2 Hash Browns',
            description: 'Rich country style breakfast loaded with protein and healthy complex carbs.',
            calories: 720,
            protein: 42,
            carbs: 54,
            fat: 34,
            prepTimeMinutes: 15,
            veggies: ['Onions', 'Chilies']
          },
          {
            id: `${day}-gnv-b3`,
            name: 'Chicken Kheema with 2 Pav/Buns',
            description: 'Minced chicken seasoned with garam masala, onions, and served with toasted buns.',
            calories: 690,
            protein: 40,
            carbs: 62,
            fat: 26,
            prepTimeMinutes: 20,
            veggies: ['Tomatoes', 'Green Peas']
          }
        ]
      },
      {
        slotId: 'lunch',
        slotTitle: 'Lunch',
        slotTime: '1:30 PM',
        primaryMeal: {
          id: `${day}-gnv-l1`,
          name: 'Chicken Curry (250g) + 3 Roti + Rice',
          description: 'Juicy chicken cooked in homestyle gravy with rotis and basmati rice.',
          calories: 920,
          protein: 60,
          carbs: 102,
          fat: 24,
          prepTimeMinutes: 30,
          veggies: ['Onions', 'Tomatoes', 'Garlic']
        },
        alternativeOptions: [
          {
            id: `${day}-gnv-l2`,
            name: 'Chicken Biryani + Egg Raita + Salad',
            description: 'Slow cooked basmati rice with tender chicken drumsticks and egg raita.',
            calories: 950,
            protein: 58,
            carbs: 112,
            fat: 26,
            prepTimeMinutes: 35,
            veggies: ['Mint', 'Onions', 'Cucumbers']
          },
          {
            id: `${day}-gnv-l3`,
            name: 'Mutton/Lamb Curry + 3 Roti + Rice',
            description: 'Rich slow simmered mutton pieces with whole wheat rotis and fragrant rice.',
            calories: 980,
            protein: 54,
            carbs: 96,
            fat: 38,
            prepTimeMinutes: 40,
            veggies: ['Ginger', 'Garlic', 'Tomatoes']
          }
        ]
      },
      {
        slotId: 'snack',
        slotTitle: 'Snack',
        slotTime: '5:30 PM',
        primaryMeal: {
          id: `${day}-gnv-s1`,
          name: 'Chicken Sandwich + Boiled Eggs',
          description: 'Shredded chicken in brown bread with boiled eggs.',
          calories: 450,
          protein: 32,
          carbs: 44,
          fat: 14,
          prepTimeMinutes: 8,
          veggies: ['Cucumber']
        },
        alternativeOptions: [
          {
            id: `${day}-gnv-s2`,
            name: 'Chicken Mayo Sandwich + 2 Boiled Eggs',
            description: 'Double tier chicken sandwich with Dijon mustard and 2 hard boiled eggs.',
            calories: 480,
            protein: 36,
            carbs: 40,
            fat: 18,
            prepTimeMinutes: 10,
            veggies: ['Lettuce']
          },
          {
            id: `${day}-gnv-s3`,
            name: 'Egg Bhurji (3 eggs) with 2 Butter Toast',
            description: 'Spicy Indian style scrambled eggs with butter toasted sourdough.',
            calories: 420,
            protein: 24,
            carbs: 36,
            fat: 20,
            prepTimeMinutes: 10,
            veggies: ['Onions', 'Tomatoes']
          }
        ]
      },
      {
        slotId: 'dinner',
        slotTitle: 'Dinner',
        slotTime: '8:30 PM',
        primaryMeal: {
          id: `${day}-gnv-d1`,
          name: 'Grilled Chicken + Mashed Potatoes + Greens',
          description: 'Seasoned grilled chicken with potato mash and steamed vegetables.',
          calories: 670,
          protein: 56,
          carbs: 60,
          fat: 18,
          prepTimeMinutes: 25,
          veggies: ['Potatoes', 'French Beans']
        },
        alternativeOptions: [
          {
            id: `${day}-gnv-d2`,
            name: 'Grilled Fish Steak + Mashed Potatoes + Sautéed Veggies',
            description: 'Pan seared seasoned sea bass fillet served with creamy potato mash.',
            calories: 710,
            protein: 52,
            carbs: 66,
            fat: 20,
            prepTimeMinutes: 25,
            veggies: ['Garlic', 'Green Beans']
          },
          {
            id: `${day}-gnv-d3`,
            name: 'Chicken Fried Rice with Egg & Veggies',
            description: 'Wok tossed chicken and jasmine rice with spring onions and scrambled eggs.',
            calories: 740,
            protein: 48,
            carbs: 84,
            fat: 22,
            prepTimeMinutes: 20,
            veggies: ['Carrots', 'Spring Onions', 'Cabbage']
          }
        ]
      }
    ]
  };
}

function generateDefaultLossBothPlan(day: DayOfWeek, tagline: string): DayDietPlan {
  return {
    day,
    tagline,
    totalCalories: 1550,
    totalProtein: 100,
    totalCarbs: 145,
    totalFat: 42,
    todayVeggies: [
      { name: 'Broccoli & Green Beans', category: 'Cruciferous' },
      { name: 'Spinach', category: 'Leafy Greens' },
      { name: 'Cucumbers & Tomatoes', category: 'Salad' },
      { name: 'Bell Peppers', category: 'Veggies' },
      { name: 'Garlic & Lemon', category: 'Aromatics' }
    ],
    meals: [
      {
        slotId: 'breakfast',
        slotTitle: 'Breakfast',
        slotTime: '8:30 AM',
        primaryMeal: {
          id: `${day}-bl-b1`,
          name: '3 Boiled Eggs & Whole Grain Toast',
          description: 'Farm fresh eggs with whole grain toast or light vegetable oats upma.',
          calories: 330,
          protein: 24,
          carbs: 22,
          fat: 10,
          prepTimeMinutes: 10,
          veggies: []
        },
        alternativeOptions: [
          {
            id: `${day}-bl-b2`,
            name: 'Vegetable Oats Upma with Peanuts',
            description: 'Fiber-rich oats dry roasted with diced carrots, peas, and mustard seeds (Veg).',
            calories: 320,
            protein: 13,
            carbs: 45,
            fat: 8,
            prepTimeMinutes: 12,
            veggies: ['Carrots', 'Green Peas', 'Ginger']
          },
          {
            id: `${day}-bl-b3`,
            name: '3 Egg Omelet with Spinach & Feta',
            description: 'Fluffy whole egg scramble with baby spinach and crushed pepper (Non-Veg).',
            calories: 340,
            protein: 26,
            carbs: 6,
            fat: 18,
            prepTimeMinutes: 10,
            veggies: ['Spinach', 'Mushrooms']
          }
        ]
      },
      {
        slotId: 'lunch',
        slotTitle: 'Lunch',
        slotTime: '1:30 PM',
        primaryMeal: {
          id: `${day}-bl-l1`,
          name: 'Grilled Herb Chicken (150g) + Brown Rice & Salad',
          description: 'Lean chicken breast seasoned with herbs and steamed brown rice with veggies.',
          calories: 520,
          protein: 42,
          carbs: 50,
          fat: 12,
          prepTimeMinutes: 25,
          veggies: ['Bell Peppers', 'Broccoli']
        },
        alternativeOptions: [
          {
            id: `${day}-bl-l2`,
            name: '2 Jowar Roti + Paneer Bhurji + Dal Tadka',
            description: 'Gluten-free sorghum rotis paired with scrambled cottage cheese and dal (Veg).',
            calories: 490,
            protein: 26,
            carbs: 60,
            fat: 12,
            prepTimeMinutes: 25,
            veggies: ['Cauliflower', 'Beans', 'Tomatoes']
          },
          {
            id: `${day}-bl-l3`,
            name: 'Chicken Tikka Wrap in Lettuce Cups',
            description: 'Tandoori spiced chicken breast wrapped in crisp iceberg lettuce (Non-Veg).',
            calories: 460,
            protein: 42,
            carbs: 14,
            fat: 12,
            prepTimeMinutes: 20,
            veggies: ['Lettuce', 'Cucumbers']
          }
        ]
      },
      {
        slotId: 'snack',
        slotTitle: 'Snack',
        slotTime: '5:00 PM',
        primaryMeal: {
          id: `${day}-bl-s1`,
          name: 'Sprouted Moong Salad & Boiled Egg',
          description: 'Crisp sprouted beans tossed with diced onions and one boiled egg.',
          calories: 150,
          protein: 11,
          carbs: 18,
          fat: 3,
          prepTimeMinutes: 5,
          veggies: ['Onions', 'Lemon', 'Tomatoes']
        },
        alternativeOptions: [
          {
            id: `${day}-bl-s2`,
            name: 'Roasted Makhana with Green Tea',
            description: 'Air-popped fox nuts lightly toasted with pink salt and black pepper (Veg).',
            calories: 120,
            protein: 4,
            carbs: 20,
            fat: 2,
            prepTimeMinutes: 3,
            veggies: []
          },
          {
            id: `${day}-bl-s3`,
            name: 'Whey Protein Shake with Water',
            description: 'Rapid protein replenishment for muscle preservation (Non-Veg / Dairy).',
            calories: 130,
            protein: 25,
            carbs: 2,
            fat: 1,
            prepTimeMinutes: 2,
            veggies: []
          }
        ]
      },
      {
        slotId: 'dinner',
        slotTitle: 'Dinner',
        slotTime: '8:00 PM',
        primaryMeal: {
          id: `${day}-bl-d1`,
          name: 'Pan-Seared Fish + Greek Salad / Paneer Stir Fry',
          description: 'White fish seasoned with paprika or paneer with garlic broccoli and clear soup.',
          calories: 370,
          protein: 34,
          carbs: 18,
          fat: 12,
          prepTimeMinutes: 18,
          veggies: ['Cucumber', 'Tomatoes', 'Lemon', 'Broccoli']
        },
        alternativeOptions: [
          {
            id: `${day}-bl-d2`,
            name: 'Tofu & Mushroom Garlic Stir Fry',
            description: 'Firm organic tofu sauteed with button mushrooms, bell peppers, and sesame (Veg).',
            calories: 320,
            protein: 20,
            carbs: 18,
            fat: 10,
            prepTimeMinutes: 15,
            veggies: ['Mushrooms', 'Zucchini', 'Garlic']
          },
          {
            id: `${day}-bl-d3`,
            name: 'Chicken Bone Broth Soup with Shredded Breast',
            description: 'Slow-cooked chicken soup with carrots, celery, and shredded chicken (Non-Veg).',
            calories: 340,
            protein: 38,
            carbs: 12,
            fat: 8,
            prepTimeMinutes: 25,
            veggies: ['Carrots', 'Celery', 'Ginger']
          }
        ]
      }
    ]
  };
}

function generateDefaultGainBothPlan(day: DayOfWeek, tagline: string): DayDietPlan {
  return {
    day,
    tagline,
    totalCalories: 2750,
    totalProtein: 155,
    totalCarbs: 325,
    totalFat: 78,
    todayVeggies: [
      { name: 'Potatoes & Sweet Potatoes', category: 'Roots' },
      { name: 'Tomatoes & Onions', category: 'Base' },
      { name: 'Green Peas', category: 'Legumes' },
      { name: 'Bell Peppers', category: 'Veggies' }
    ],
    meals: [
      {
        slotId: 'breakfast',
        slotTitle: 'Heavy Breakfast',
        slotTime: '8:00 AM',
        primaryMeal: {
          id: `${day}-bg-b1`,
          name: '4 Eggs Scramble + 3 Toast + Peanut Butter Shake',
          description: 'Whole eggs with butter toast and high-calorie peanut butter banana smoothie.',
          calories: 740,
          protein: 42,
          carbs: 76,
          fat: 26,
          prepTimeMinutes: 15,
          veggies: ['Onions', 'Tomatoes']
        },
        alternativeOptions: [
          {
            id: `${day}-bg-b2`,
            name: 'Oats with Peanut Butter, Milk & Dry Fruits',
            description: 'Rolled oats cooked in whole milk with generous peanut butter and almonds (Veg).',
            calories: 680,
            protein: 30,
            carbs: 88,
            fat: 22,
            prepTimeMinutes: 10,
            veggies: []
          },
          {
            id: `${day}-bg-b3`,
            name: 'Chicken Kheema with 2 Pav/Buns',
            description: 'Minced chicken in roasted spices with toasted buns (Non-Veg).',
            calories: 690,
            protein: 40,
            carbs: 62,
            fat: 26,
            prepTimeMinutes: 20,
            veggies: ['Tomatoes', 'Green Peas']
          }
        ]
      },
      {
        slotId: 'lunch',
        slotTitle: 'Lunch',
        slotTime: '1:30 PM',
        primaryMeal: {
          id: `${day}-bg-l1`,
          name: 'Chicken Curry (220g) or Paneer Masala + 3 Roti + Rice',
          description: 'Chicken drumsticks or cottage cheese in rich gravy with wheat rotis and basmati rice.',
          calories: 910,
          protein: 58,
          carbs: 104,
          fat: 24,
          prepTimeMinutes: 30,
          veggies: ['Onions', 'Tomatoes', 'Garlic']
        },
        alternativeOptions: [
          {
            id: `${day}-bg-l2`,
            name: 'Rajma Chawal + Paneer Tikka + Salad',
            description: 'Red kidney bean curry with steamed basmati rice and grilled paneer (Veg).',
            calories: 890,
            protein: 38,
            carbs: 115,
            fat: 22,
            prepTimeMinutes: 30,
            veggies: ['Tomatoes', 'Onions']
          },
          {
            id: `${day}-bg-l3`,
            name: 'Chicken Biryani + Egg Raita + Salad',
            description: 'Basmati rice cooked with spiced chicken and egg raita (Non-Veg).',
            calories: 940,
            protein: 58,
            carbs: 110,
            fat: 26,
            prepTimeMinutes: 35,
            veggies: ['Mint', 'Onions', 'Cucumbers']
          }
        ]
      },
      {
        slotId: 'snack',
        slotTitle: 'Snack',
        slotTime: '5:30 PM',
        primaryMeal: {
          id: `${day}-bg-s1`,
          name: 'Chicken or Paneer Sandwich + Banana',
          description: 'Whole wheat grilled sandwich with sliced protein and a fresh banana.',
          calories: 440,
          protein: 26,
          carbs: 50,
          fat: 14,
          prepTimeMinutes: 8,
          veggies: ['Cucumber']
        },
        alternativeOptions: [
          {
            id: `${day}-bg-s2`,
            name: 'Peanut Butter Banana Toast (2) + Warm Milk',
            description: 'Toasted bread with crunchy peanut butter, banana discs, and honey (Veg).',
            calories: 460,
            protein: 18,
            carbs: 62,
            fat: 16,
            prepTimeMinutes: 5,
            veggies: []
          },
          {
            id: `${day}-bg-s3`,
            name: 'Double Egg Mayo Sandwich with Boiled Eggs',
            description: 'Whole wheat bread packed with seasoned egg scramble (Non-Veg).',
            calories: 430,
            protein: 26,
            carbs: 38,
            fat: 18,
            prepTimeMinutes: 8,
            veggies: ['Lettuce']
          }
        ]
      },
      {
        slotId: 'dinner',
        slotTitle: 'Dinner',
        slotTime: '8:30 PM',
        primaryMeal: {
          id: `${day}-bg-d1`,
          name: 'Grilled Chicken or Paneer Butter Masala + 3 Parathas',
          description: 'Seasoned grilled chicken or paneer with flaky wheat parathas and curd.',
          calories: 660,
          protein: 50,
          carbs: 70,
          fat: 18,
          prepTimeMinutes: 25,
          veggies: ['Potatoes', 'French Beans', 'Garlic']
        },
        alternativeOptions: [
          {
            id: `${day}-bg-d2`,
            name: 'Chole Masala + 3 Parathas + Curd',
            description: 'Rich chickpeas in aromatic spices with wheat flatbreads and probiotic curd (Veg).',
            calories: 660,
            protein: 32,
            carbs: 98,
            fat: 16,
            prepTimeMinutes: 25,
            veggies: ['Tomatoes', 'Onions', 'Ginger']
          },
          {
            id: `${day}-bg-d3`,
            name: 'Grilled Fish Steak + Mashed Potatoes + Greens',
            description: 'Pan seared white fish with creamy potato mash and steamed greens (Non-Veg).',
            calories: 670,
            protein: 52,
            carbs: 62,
            fat: 18,
            prepTimeMinutes: 25,
            veggies: ['Garlic', 'Green Beans']
          }
        ]
      }
    ]
  };
}

// ============================================================================
// ADDITIONAL RECIPE TYPES (Bottom Carousel / Grid)
// ============================================================================

export const ADDITIONAL_RECIPES: AdditionalRecipe[] = [
  {
    id: 'ar-1',
    title: 'Protein Avocado Tofu Toast',
    category: 'High Protein',
    calories: 290,
    protein: 16,
    prepTime: '8 mins',
    dietType: 'veg',
    imageIcon: '🥑',
    description: 'Crisp sourdough spread with ripe avocado, grilled turmeric tofu cubes, and chilli flakes.',
    keyIngredients: ['Sourdough', 'Ripe Avocado', 'Firm Tofu', 'Lemon Juice', 'Chilli Flakes']
  },
  {
    id: 'ar-2',
    title: 'Herb Lemon Grilled Chicken Skewers',
    category: 'High Protein',
    calories: 340,
    protein: 36,
    prepTime: '15 mins',
    dietType: 'nonveg',
    imageIcon: '🍗',
    description: 'Juicy chicken breast cubes marinated in hung curd, lemon, garlic, and fresh rosemary.',
    keyIngredients: ['Chicken Breast', 'Hung Curd', 'Garlic', 'Rosemary', 'Olive Oil']
  },
  {
    id: 'ar-3',
    title: '10-Min Masala Oats Khichdi',
    category: 'Quick 10-Min',
    calories: 260,
    protein: 11,
    prepTime: '10 mins',
    dietType: 'veg',
    imageIcon: '🍲',
    description: 'Quick-cooking rolled oats tempered with cumin, tomatoes, green peas, and mild turmeric.',
    keyIngredients: ['Rolled Oats', 'Green Peas', 'Tomatoes', 'Cumin', 'Ghee']
  },
  {
    id: 'ar-4',
    title: 'Green Monster Detox Smoothie',
    category: 'Smoothie & Detox',
    calories: 180,
    protein: 9,
    prepTime: '5 mins',
    dietType: 'veg',
    imageIcon: '🥤',
    description: 'Nutrient-rich power blend of baby spinach, green apple, cucumber, mint, and chia seeds.',
    keyIngredients: ['Baby Spinach', 'Green Apple', 'Cucumber', 'Mint Leaves', 'Chia Seeds']
  },
  {
    id: 'ar-5',
    title: 'Egg White Veggie Scramble Bowl',
    category: 'Quick 10-Min',
    calories: 220,
    protein: 24,
    prepTime: '7 mins',
    dietType: 'nonveg',
    imageIcon: '🍳',
    description: 'Quick skillet of 4 egg whites sautéed with crunchy bell peppers, onions, and black pepper.',
    keyIngredients: ['Egg Whites', 'Bell Peppers', 'Onions', 'Black Pepper', 'Olive Oil']
  },
  {
    id: 'ar-6',
    title: 'Roasted Chickpea & Quinoa Bowl',
    category: 'Nutrient Dense',
    calories: 380,
    protein: 18,
    prepTime: '12 mins',
    dietType: 'veg',
    imageIcon: '🥗',
    description: 'Crispy oven-baked chickpeas layered over warm quinoa, cucumbers, and tahini lemon dressing.',
    keyIngredients: ['Boiled Chickpeas', 'Quinoa', 'Cucumbers', 'Tahini', 'Lemon']
  }
];
