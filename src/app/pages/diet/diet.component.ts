import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  AfterViewInit,
  viewChild,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../components/header/header.component';
import { DietPreferenceModalComponent } from '../../components/diet-preference-modal/diet-preference-modal.component';
import {
  AddRecipeModalComponent,
  AddedRecipeEvent,
  UpdatedScheduleRecipeEvent,
  RecipeDestination
} from '../../components/add-recipe-modal/add-recipe-modal.component';
import { MoveRecipeModalComponent } from '../../components/move-recipe-modal/move-recipe-modal.component';
import {
  DietService,
  DietGoal,
  DietType,
  DayOfWeek,
  DayDietPlan,
  MealSlot,
  MealOption,
  AdditionalRecipe
} from '../../core/services/diet.service';
import { AuthService } from '../../core/services/auth.service';

export type SlotFilter = 'breakfast' | 'lunch' | 'dinner';
export type VeggiesFilterMode = 'current_meal' | 'all_day';

export interface CircularDayItem {
  id: string;
  name: DayOfWeek;
  abbr: string;
  label: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
  cycleIndex: number;
  globalIndex: number;
}

interface SlotTab {
  id: SlotFilter;
  label: string;
}

export interface MealOptionItem {
  option: MealOption;
  isSelected: boolean;
  isPrimary: boolean;
}

export interface ToastNotification {
  title: string;
  subtitle?: string;
}

@Component({
  selector: 'app-diet',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    DietPreferenceModalComponent,
    AddRecipeModalComponent,
    MoveRecipeModalComponent
  ],
  templateUrl: './diet.component.html',
  styleUrl: './diet.component.css'
})
export class DietComponent implements OnInit, AfterViewInit {
  readonly dietService = inject(DietService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Reference to week scroll track for centered smooth scroll
  readonly weekScrollContainer = viewChild<ElementRef<HTMLElement>>('weekScrollContainer');

  // Preferences & Modals
  readonly isDietModalOpen = signal<boolean>(false);
  readonly isAddRecipeModalOpen = signal<boolean>(false);
  readonly modalMode = signal<'add' | 'edit'>('add');
  readonly editingMeal = signal<MealOption | null>(null);
  readonly editingAdditionalRecipe = signal<AdditionalRecipe | null>(null);
  readonly toastNotification = signal<ToastNotification | null>(null);
  readonly toastMessage = signal<string | null>(null);
  readonly addRecipeModalTarget = signal<RecipeDestination>('day_meal');
  readonly addRecipeModalSlot = signal<'breakfast' | 'lunch' | 'dinner'>('lunch');
  readonly currentGoal = computed<DietGoal>(() => this.dietService.preference()?.goal || 'loss');
  readonly currentDietType = computed<DietType>(() => this.dietService.preference()?.dietType || 'veg');
  readonly hasPreference = computed<boolean>(() => this.dietService.hasPreference());

  // Today's day name & circular week items (5 cycles: -2, -1, 0, 1, 2 = 35 days)
  // Sequence: Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday
  // Sunday is ALWAYS immediately before Monday!
  readonly todayDayName: DayOfWeek = this.dietService.getCurrentDayName();
  readonly circularDays = signal<CircularDayItem[]>(this.generateCircularDays());

  // Middle cycle (cycle 0) today index: 14 + currentDayIndex
  readonly selectedGlobalIndex = signal<number>(this.getInitialTodayGlobalIndex());
  readonly selectedDay = signal<DayOfWeek>(this.todayDayName);

  // Time-of-day auto-pick: exactly 3 options (Breakfast, Lunch, Dinner)
  readonly currentTimeSlot = signal<SlotFilter>(this.dietService.getCurrentTimeSlot());
  readonly activeSlotFilter = signal<SlotFilter>(this.currentTimeSlot());
  readonly resolvedSlotId = computed(() => this.activeSlotFilter());

  readonly slotTabs: SlotTab[] = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'dinner', label: 'Dinner' }
  ];

  // Backend day data fetching & caching
  // 1 day data is fetched once; switching days loads on-demand with shimmers and zero layout shift
  private readonly cachedDayPlans = new Map<string, DayDietPlan>();
  readonly isLoadingDay = signal<boolean>(false);
  readonly activeDayPlan = signal<DayDietPlan>(
    this.dietService.getDayPlan(this.todayDayName, this.currentGoal(), this.currentDietType())
  );

  // Meal selection overrides per day & slot (remember user's chosen options)
  readonly selectedMealOverrides = signal<Record<string, string>>(this.loadMealOverrides());

  // Veggies required state - Always All Day
  readonly veggiesViewMode = signal<VeggiesFilterMode>('all_day');
  readonly checkedVeggies = signal<string[]>(this.loadCheckedVeggies());
  readonly copiedToastMessage = signal<string | null>(null);

  // Additional Recipes - All with no filter
  readonly selectedRecipeCategory = signal<string>('All');
  readonly recipeCategories = ['All'];
  readonly activeRecipeModal = signal<AdditionalRecipe | null>(null);

  // Day diet plan alias for backward compatibility with tests
  readonly dayPlan = computed<DayDietPlan>(() => this.activeDayPlan());

  // Active meal slot matching activeSlotFilter
  readonly activeMealSlot = computed<MealSlot>(() => {
    const plan = this.activeDayPlan();
    const filter = this.activeSlotFilter();
    const found = plan.meals.find(m => m.slotId === filter);
    return found || plan.meals[0];
  });

  // Simple read-only list of cooking options for active day and meal
  readonly slotOptions = computed<MealOption[]>(() => {
    const slot = this.activeMealSlot();
    return [slot.primaryMeal, ...slot.alternativeOptions];
  });

  // Flat list of options alias for backward compatibility with tests
  readonly mealOptionsList = computed<MealOptionItem[]>(() => {
    const slot = this.activeMealSlot();
    const active = this.getActiveMeal(slot);

    const list: MealOptionItem[] = [
      {
        option: slot.primaryMeal,
        isSelected: active.id === slot.primaryMeal.id,
        isPrimary: true
      }
    ];

    slot.alternativeOptions.forEach(alt => {
      list.push({
        option: alt,
        isSelected: active.id === alt.id,
        isPrimary: false
      });
    });

    return list;
  });

  // All day fresh vegetables required
  readonly displayedVeggies = computed<{ name: string; category: string; checked: boolean }[]>(() => {
    const plan = this.activeDayPlan();
    const checked = new Set(this.checkedVeggies());
    return plan.todayVeggies.map(v => ({
      name: v.name,
      category: v.category || 'Fresh',
      checked: checked.has(v.name)
    }));
  });

  // Additional Recipes - All recipes with no category filter
  readonly additionalRecipes = computed<AdditionalRecipe[]>(() => {
    return this.dietService.getAdditionalRecipes(this.currentDietType(), this.currentGoal());
  });

  ngOnInit(): void {
    if (!this.hasPreference()) {
      this.isDietModalOpen.set(true);
    }

    // Cache initial day data
    const initialKey = this.getCacheKey(this.todayDayName);
    this.cachedDayPlans.set(initialKey, this.activeDayPlan());
  }

  ngAfterViewInit(): void {
    // Multi-stage auto-centering guarantees the selected day is in the dead center on page load
    const centerNow = () => this.centerChipByIndex(this.selectedGlobalIndex(), false);
    centerNow();
    requestAnimationFrame(centerNow);
    setTimeout(centerNow, 50);
    setTimeout(centerNow, 150);
    setTimeout(centerNow, 350);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  /**
   * User clicks a specific chip in the circular queue.
   * Performs a slight, smooth scroll to place this specific chip in the center.
   */
  async selectCircularDay(day: CircularDayItem): Promise<void> {
    if (this.selectedGlobalIndex() === day.globalIndex) {
      this.centerChipByIndex(day.globalIndex, true);
      return;
    }

    this.selectedGlobalIndex.set(day.globalIndex);
    this.centerChipByIndex(day.globalIndex, true);
    await this.selectDay(day.name, false);

    this.scheduleQueueNormalization(day.globalIndex);
  }

  /**
   * Selects day and fetches backend data.
   * If updateGlobalIndex is true (e.g. from tests or external calls),
   * shifts by the shortest circular distance (-3..+3 chips) rather than a full scroll!
   */
  async selectDay(day: DayOfWeek, updateGlobalIndex = true): Promise<void> {
    if (updateGlobalIndex) {
      const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentIdx = days.indexOf(this.selectedDay());
      const targetIdx = days.indexOf(day);
      let diff = targetIdx - currentIdx;
      if (diff > 3) diff -= 7;
      if (diff < -3) diff += 7;

      const targetGlobal = this.selectedGlobalIndex() + diff;
      this.selectedGlobalIndex.set(targetGlobal);
      this.centerChipByIndex(targetGlobal, true);
      this.scheduleQueueNormalization(targetGlobal);
    }

    this.selectedDay.set(day);

    const cacheKey = this.getCacheKey(day);
    const cached = this.cachedDayPlans.get(cacheKey);

    if (cached) {
      // Instant switch with smooth ease crossfade
      this.activeDayPlan.set(cached);
    } else {
      // Backend fetch simulation: 1 day data fetched on-demand with smooth shimmer
      this.isLoadingDay.set(true);
      try {
        const fetchedPlan = await this.dietService.fetchDayPlan(day, this.currentGoal(), this.currentDietType());
        this.cachedDayPlans.set(cacheKey, fetchedPlan);
        this.activeDayPlan.set(fetchedPlan);
      } finally {
        this.isLoadingDay.set(false);
      }
    }
  }

  private scheduleQueueNormalization(globalIndex: number): void {
    if (globalIndex < 7 || globalIndex >= 28) {
      setTimeout(() => {
        const normalizedIndex = 14 + ((globalIndex - 14) % 7 + 7) % 7;
        this.selectedGlobalIndex.set(normalizedIndex);
        this.centerChipByIndex(normalizedIndex, false);
      }, 400);
    }
  }

  centerSelectedDay(smooth = true): void {
    this.centerChipByIndex(this.selectedGlobalIndex(), smooth);
  }

  centerChipByIndex(index: number, smooth = true): void {
    const container = this.weekScrollContainer()?.nativeElement;
    if (!container) return;

    const targetChip = container.querySelector(`[data-global-index="${index}"]`) as HTMLElement;
    if (targetChip) {
      if (typeof targetChip.scrollIntoView === 'function' && !smooth) {
        try {
          targetChip.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'instant' });
        } catch {}
      }

      const containerWidth = container.offsetWidth || container.clientWidth;
      const chipLeft = targetChip.offsetLeft;
      const chipWidth = targetChip.offsetWidth || 64;
      const targetScroll = chipLeft - (containerWidth / 2) + (chipWidth / 2);

      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          left: Math.max(0, targetScroll),
          behavior: smooth ? 'smooth' : 'auto'
        });
      } else {
        container.scrollLeft = Math.max(0, targetScroll);
      }
    }
  }

  setSlotFilter(slot: SlotFilter): void {
    this.activeSlotFilter.set(slot);
  }

  getActiveMeal(slot: MealSlot): MealOption {
    const key = `${this.selectedDay()}_${slot.slotId}`;
    const chosenId = this.selectedMealOverrides()[key];
    if (chosenId) {
      if (slot.primaryMeal.id === chosenId) {
        return slot.primaryMeal;
      }
      const alt = slot.alternativeOptions.find(opt => opt.id === chosenId);
      if (alt) return alt;
    }
    return slot.primaryMeal;
  }

  getAllOptionsForSlot(slot: MealSlot): MealOptionItem[] {
    const active = this.getActiveMeal(slot);
    const list: MealOptionItem[] = [
      {
        option: slot.primaryMeal,
        isSelected: active.id === slot.primaryMeal.id,
        isPrimary: true
      }
    ];

    slot.alternativeOptions.forEach(alt => {
      list.push({
        option: alt,
        isSelected: active.id === alt.id,
        isPrimary: false
      });
    });

    return list;
  }

  selectMealOption(slotId: string, mealId: string): void {
    const key = `${this.selectedDay()}_${slotId}`;
    this.selectedMealOverrides.update(prev => {
      const next = { ...prev, [key]: mealId };
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('apdock_meal_overrides', JSON.stringify(next));
        }
      } catch {}
      return next;
    });
  }

  toggleVeggie(name: string): void {
    this.checkedVeggies.update(prev => {
      const set = new Set(prev);
      if (set.has(name)) {
        set.delete(name);
      } else {
        set.add(name);
      }
      const updated = Array.from(set);
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('apdock_checked_veggies', JSON.stringify(updated));
        }
      } catch {}
      return updated;
    });
  }

  async copyVeggiesList(): Promise<void> {
    const veggies = this.displayedVeggies();
    const checked = new Set(this.checkedVeggies());
    const needed = veggies.filter(v => !checked.has(v.name)).map(v => `• ${v.name}`);

    const text = needed.length > 0
      ? `Groceries for ${this.selectedDay()}:\n${needed.join('\n')}`
      : `All fresh ingredients checked off!`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        this.showToast('Copied to clipboard');
      }
    } catch {
      this.showToast('Checklist ready');
    }
  }

  setVeggiesViewMode(mode: VeggiesFilterMode): void {
    this.veggiesViewMode.set(mode);
  }

  setRecipeCategory(category: string): void {
    this.selectedRecipeCategory.set(category);
  }

  openRecipeModal(recipe: AdditionalRecipe): void {
    this.activeRecipeModal.set(recipe);
  }

  closeRecipeModal(): void {
    this.activeRecipeModal.set(null);
  }

  openDietModal(): void {
    this.isDietModalOpen.set(true);
  }

  closeDietModal(): void {
    this.isDietModalOpen.set(false);
  }

  onDietPreferenceSaved(): void {
    this.isDietModalOpen.set(false);
    this.cachedDayPlans.clear();
    this.selectDay(this.selectedDay());
  }

  openAddRecipeModal(target: RecipeDestination = 'day_meal'): void {
    this.modalMode.set('add');
    this.editingMeal.set(null);
    this.editingAdditionalRecipe.set(null);
    this.addRecipeModalTarget.set(target);
    this.addRecipeModalSlot.set(this.activeSlotFilter());
    this.isAddRecipeModalOpen.set(true);
  }

  openEditScheduleRecipeModal(dish: MealOption): void {
    this.modalMode.set('edit');
    this.editingMeal.set(dish);
    this.editingAdditionalRecipe.set(null);
    this.addRecipeModalSlot.set(this.activeSlotFilter());
    this.isAddRecipeModalOpen.set(true);
  }

  openEditAdditionalRecipeModal(recipe: AdditionalRecipe): void {
    this.closeRecipeModal();
    this.modalMode.set('edit');
    this.editingMeal.set(null);
    this.editingAdditionalRecipe.set(recipe);
    this.addRecipeModalTarget.set('additional');
    this.isAddRecipeModalOpen.set(true);
  }

  closeAddRecipeModal(): void {
    this.isAddRecipeModalOpen.set(false);
    this.editingMeal.set(null);
    this.editingAdditionalRecipe.set(null);
    this.modalMode.set('add');
  }

  onRecipeAdded(event: AddedRecipeEvent): void {
    if (event.destination === 'day_meal' || event.destination === 'both') {
      this.cachedDayPlans.clear();
      this.activeDayPlan.set(
        this.dietService.getDayPlan(this.selectedDay(), this.currentGoal(), this.currentDietType())
      );
    }
    const dest = event.destination === 'additional' ? 'Additional Recipes' : 'Day Meal Schedule';
    this.showToast('Recipe Added', `Saved to ${dest}`);
  }

  onRecipeUpdated(event: UpdatedScheduleRecipeEvent): void {
    this.cachedDayPlans.clear();
    this.activeDayPlan.set(
      this.dietService.getDayPlan(this.selectedDay(), this.currentGoal(), this.currentDietType())
    );
    this.closeAddRecipeModal();
    this.showToast('Schedule Updated', event.name);
  }

  onAdditionalRecipeUpdated(recipe: AdditionalRecipe): void {
    this.cachedDayPlans.clear();
    this.activeDayPlan.set(
      this.dietService.getDayPlan(this.selectedDay(), this.currentGoal(), this.currentDietType())
    );
    this.closeAddRecipeModal();
    this.showToast('Recipe Updated', recipe.title);
  }

  onAdditionalRecipeDeleted(recipe: AdditionalRecipe): void {
    this.cachedDayPlans.clear();
    this.activeDayPlan.set(
      this.dietService.getDayPlan(this.selectedDay(), this.currentGoal(), this.currentDietType())
    );
    this.closeAddRecipeModal();
    this.showToast('Recipe Deleted', recipe.title);
  }

  removeRecipeFromSchedule(dish: MealOption): void {
    this.dietService.removeRecipeFromSchedule(dish, this.selectedDay(), this.activeSlotFilter());
    this.cachedDayPlans.clear();
    this.activeDayPlan.set(
      this.dietService.getDayPlan(this.selectedDay(), this.currentGoal(), this.currentDietType())
    );
    if (this.isAddRecipeModalOpen()) {
      this.closeAddRecipeModal();
    }
    this.showToast('Moved to Additional Recipes', dish.name);
  }

  onRecipeMovedToSchedule(event: {
    recipe: AdditionalRecipe;
    slotId: 'breakfast' | 'lunch' | 'dinner';
    applyToAllDays: boolean;
  }): void {
    const targetDay = this.selectedDay();
    this.dietService.moveAdditionalRecipeToSchedule({
      recipe: event.recipe,
      slotId: event.slotId,
      day: targetDay,
      applyToAllDays: event.applyToAllDays
    });

    this.cachedDayPlans.clear();
    this.activeDayPlan.set(
      this.dietService.getDayPlan(targetDay, this.currentGoal(), this.currentDietType())
    );
    this.activeSlotFilter.set(event.slotId);

    const dayText = event.applyToAllDays ? 'All Days (Mon–Sun)' : targetDay;
    const slotText = event.slotId.charAt(0).toUpperCase() + event.slotId.slice(1);

    this.closeRecipeModal();
    this.showToast('Moved to Schedule', `"${event.recipe.title}" → ${dayText} · ${slotText}`);
  }

  private getInitialTodayGlobalIndex(): number {
    const currentDayIndex = new Date().getDay();
    // Cycle 0 starts at index 14 (cycle -2: 0..6, cycle -1: 7..13, cycle 0: 14..20)
    return 14 + currentDayIndex;
  }

  private generateCircularDays(): CircularDayItem[] {
    const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date();
    // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const currentDayIndex = today.getDay();

    const items: CircularDayItem[] = [];
    // 5 complete cycles: cycles -2, -1, 0, 1, 2
    // Sunday (index 0) is immediately followed by Monday (index 1) across all cycles!
    for (let cycle = -2; cycle <= 2; cycle++) {
      days.forEach((dayName, dayIdx) => {
        const diffFromToday = (cycle * 7) + (dayIdx - currentDayIndex);
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + diffFromToday);

        const abbr = dayName.slice(0, 3).toUpperCase(); // 'SUN', 'MON'
        const label = dayName.slice(0, 3); // 'Sun', 'Mon'

        items.push({
          id: `day_c${cycle}_${dayName}_${items.length}`,
          name: dayName,
          abbr,
          label,
          dayNumber: targetDate.getDate(),
          monthName: targetDate.toLocaleString('default', { month: 'short' }),
          isToday: cycle === 0 && dayName === this.todayDayName,
          cycleIndex: cycle,
          globalIndex: items.length
        });
      });
    }
    return items;
  }

  private getCacheKey(day: DayOfWeek): string {
    return `${this.currentGoal()}_${this.currentDietType()}_${day}`;
  }

  showToast(title: string, subtitle?: string): void {
    const formatted = subtitle ? `"${subtitle}" ${title.toLowerCase()}` : title;
    const message = title === 'Moved to Additional Recipes' && subtitle
      ? `"${subtitle}" moved to Additional Recipes`
      : formatted;
    this.toastMessage.set(message);
    this.copiedToastMessage.set(message);
    this.toastNotification.set({ title, subtitle });
    setTimeout(() => {
      this.toastMessage.set(null);
      this.copiedToastMessage.set(null);
      this.toastNotification.set(null);
    }, 2800);
  }

  private loadMealOverrides(): Record<string, string> {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('apdock_meal_overrides');
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return {};
  }

  private loadCheckedVeggies(): string[] {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('apdock_checked_veggies');
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return [];
  }
}
