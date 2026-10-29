import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
  OnChanges,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DietService,
  AdditionalRecipe,
  DietType,
  DayOfWeek,
  CustomDayMeal,
  MealOption
} from '../../core/services/diet.service';

export type RecipeDestination = 'day_meal' | 'additional' | 'both';

export interface AddedRecipeEvent {
  destination: RecipeDestination;
  title: string;
  keyIngredients: string[];
  dietType: DietType;
  mealSlot: 'breakfast' | 'lunch' | 'dinner';
  day: DayOfWeek;
  additionalRecipe?: AdditionalRecipe;
  customMeal?: CustomDayMeal;
}

export interface UpdatedScheduleRecipeEvent {
  id: string;
  name: string;
  veggies: string[];
  day: DayOfWeek;
  slotId: 'breakfast' | 'lunch' | 'dinner';
  originalDay?: DayOfWeek;
  originalSlotId?: 'breakfast' | 'lunch' | 'dinner';
}

export const COMMON_INGREDIENTS = [
  'Fresh Spinach (Palak)',
  'Red Tomatoes',
  'Cucumbers',
  'Onions',
  'Garlic Cloves',
  'Ginger',
  'Green Bell Peppers (Capsicum)',
  'Red Bell Peppers',
  'Yellow Bell Peppers',
  'Broccoli Florets',
  'Cauliflower (Gobi)',
  'Paneer (Cottage Cheese)',
  'Firm Tofu',
  'Chicken Breast',
  'Whole Eggs',
  'Egg Whites',
  'Button Mushrooms',
  'Green Peas (Matar)',
  'Carrots',
  'Zucchini',
  'Bottle Gourd (Lauki)',
  'Boiled Potatoes (Aloo)',
  'Sweet Potato',
  'Rolled Oats',
  'Brown Rice',
  'Basmati White Rice',
  'Sourdough Bread',
  'Whole Wheat Roti',
  'Sprouted Moong Dal',
  'Boiled Chickpeas (Chana)',
  'Kidney Beans (Rajma)',
  'Soya Chunks',
  'Fresh Lemon / Lime',
  'Fresh Coriander / Cilantro',
  'Fresh Mint Leaves (Pudina)',
  'Green Chillies',
  'Olive Oil',
  'Pure Cow Ghee',
  'Cumin Seeds (Jeera)',
  'Turmeric Powder (Haldi)',
  'Black Pepper Powder',
  'Mustard Seeds (Rai)',
  'Greek Yogurt / Hung Curd',
  'Almonds (Badam)',
  'Walnuts (Akhrot)',
  'Chia Seeds',
  'Flax Seeds',
  'Ripe Avocado',
  'Lettuce Greens',
  'Curry Leaves'
];

@Component({
  selector: 'app-add-recipe-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-recipe-modal.component.html',
  styleUrl: './add-recipe-modal.component.css'
})
export class AddRecipeModalComponent implements OnChanges, OnDestroy {
  private readonly dietService = inject(DietService);

  @Input() isOpen = false;
  @Input() mode: 'add' | 'edit' = 'add';
  @Input() editingMeal?: MealOption;
  @Input() editingAdditionalRecipe?: AdditionalRecipe;
  @Input() initialDestination: RecipeDestination = 'day_meal';
  @Input() initialSlot: 'breakfast' | 'lunch' | 'dinner' = 'lunch';
  @Input() activeDay: DayOfWeek = 'Monday';

  @Output() close = new EventEmitter<void>();
  @Output() added = new EventEmitter<AddedRecipeEvent>();
  @Output() updated = new EventEmitter<UpdatedScheduleRecipeEvent>();
  @Output() updatedAdditional = new EventEmitter<AdditionalRecipe>();
  @Output() removed = new EventEmitter<MealOption>();
  @Output() deletedAdditional = new EventEmitter<AdditionalRecipe>();

  @ViewChild('searchInput') searchInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('nameInput') nameInputRef?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;

  readonly destination = signal<RecipeDestination>('day_meal');
  readonly mealSlot = signal<'breakfast' | 'lunch' | 'dinner'>('lunch');
  readonly targetDay = signal<DayOfWeek>('Monday');

  readonly recipeName = signal<string>('');
  readonly ingredients = signal<string[]>([]);
  readonly searchQuery = signal<string>('');
  readonly isDropdownOpen = signal<boolean>(false);
  readonly focusedIndex = signal<number>(-1);
  readonly errorMessage = signal<string | null>(null);
  readonly selectedCategory = signal<'High Protein' | 'Quick 10-Min' | 'Nutrient Dense' | 'Smoothie & Detox'>('High Protein');
  readonly selectedDietType = signal<DietType>('veg');
  readonly isConfirmRemoveOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  readonly weekDays: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  readonly mealSlots: { id: 'breakfast' | 'lunch' | 'dinner'; label: string; icon: string }[] = [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { id: 'lunch', label: 'Lunch', icon: '☀️' },
    { id: 'dinner', label: 'Dinner', icon: '🌙' }
  ];

  readonly contextSubtitle = computed<string>(() => {
    const slotLabel = this.getSlotLabel(this.mealSlot());
    if (this.mode === 'edit') {
      if (this.editingAdditionalRecipe) {
        return 'Editing · Additional Recipes';
      }
      return `Editing · ${this.targetDay()} · ${slotLabel}`;
    }
    if (this.destination() === 'day_meal') {
      return `Adding to ${this.targetDay()} · ${slotLabel}`;
    }
    return `Adding to Additional Recipes`;
  });

  ngOnChanges(): void {
    if (this.isOpen) {
      this.lockBodyScroll();
      if (this.mode === 'edit') {
        if (this.editingAdditionalRecipe) {
          this.recipeName.set(this.editingAdditionalRecipe.title);
          this.ingredients.set(this.editingAdditionalRecipe.keyIngredients ? [...this.editingAdditionalRecipe.keyIngredients] : []);
          this.selectedDietType.set(this.editingAdditionalRecipe.dietType === 'nonveg' ? 'nonveg' : 'veg');
          this.selectedCategory.set(this.editingAdditionalRecipe.category || 'High Protein');
          this.destination.set('additional');
        } else if (this.editingMeal) {
          this.recipeName.set(this.editingMeal.name);
          this.ingredients.set(this.editingMeal.veggies ? [...this.editingMeal.veggies] : []);
          this.destination.set('day_meal');
          if (this.initialSlot) {
            this.mealSlot.set(this.initialSlot);
          }
          if (this.activeDay) {
            this.targetDay.set(this.activeDay);
          }
        }
      } else {
        if (this.initialDestination) {
          this.destination.set(this.initialDestination);
        }
        if (this.initialSlot) {
          this.mealSlot.set(this.initialSlot);
        }
        if (this.activeDay) {
          this.targetDay.set(this.activeDay);
        }
      }
      this.adjustNameInputHeight();
    } else {
      this.unlockBodyScroll();
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  private savedScrollY = 0;

  private lockBodyScroll(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
      document.documentElement.classList.add('modal-open');
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  }

  private unlockBodyScroll(): void {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      if (this.savedScrollY > 0 && typeof window.scrollTo === 'function') {
        try {
          window.scrollTo({
            top: this.savedScrollY,
            behavior: 'instant' as ScrollBehavior
          });
        } catch {}
      }
    }
  }

  onBackdropTouchMove(event: TouchEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.sheet-body')) {
      event.preventDefault();
    }
  }

  onInputFocus(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    setTimeout(() => {
      if (typeof target?.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 280);
  }

  private getSlotLabel(slot: 'breakfast' | 'lunch' | 'dinner'): string {
    switch (slot) {
      case 'breakfast': return 'Breakfast';
      case 'lunch': return 'Lunch';
      case 'dinner': return 'Dinner';
      default: return 'Meal';
    }
  }

  readonly filteredIngredients = computed<string[]>(() => {
    const rawQuery = this.searchQuery().trim();
    const query = rawQuery.toLowerCase();
    const currentList = new Set(this.ingredients().map(i => i.toLowerCase()));

    if (!query) {
      return COMMON_INGREDIENTS.filter(item => !currentList.has(item.toLowerCase())).slice(0, 6);
    }

    const matches = COMMON_INGREDIENTS.filter(item =>
      !currentList.has(item.toLowerCase()) && item.toLowerCase().includes(query)
    );

    const hasExact = matches.some(m => m.toLowerCase() === query);
    if (!hasExact && rawQuery.length > 1 && !currentList.has(query)) {
      matches.push(rawQuery);
    }

    return matches.slice(0, 8);
  });

  setDestination(dest: RecipeDestination): void {
    this.destination.set(dest);
  }

  setMealSlot(slot: 'breakfast' | 'lunch' | 'dinner'): void {
    this.mealSlot.set(slot);
  }

  setTargetDay(day: DayOfWeek): void {
    this.targetDay.set(day);
  }

  onSearchFocus(): void {
    this.isDropdownOpen.set(true);
    this.focusedIndex.set(-1);
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.isDropdownOpen.set(false);
      this.focusedIndex.set(-1);
    }, 200);
  }

  onRecipeNameChange(value: string): void {
    const cleanValue = value.replace(/[\r\n]+/g, ' ');
    this.recipeName.set(cleanValue);
    this.errorMessage.set(null);
    this.adjustNameInputHeight();
  }

  adjustNameInputHeight(): void {
    setTimeout(() => {
      const el = this.nameInputRef?.nativeElement as HTMLTextAreaElement | undefined;
      if (el) {
        el.style.height = 'auto';
        el.style.height = `${Math.max(48, el.scrollHeight)}px`;
      }
    }, 0);
  }

  onSearchInput(): void {
    this.isDropdownOpen.set(true);
    this.focusedIndex.set(-1);
    this.errorMessage.set(null);
  }

  clearSearchQuery(event?: MouseEvent): void {
    event?.stopPropagation();
    this.searchQuery.set('');
    this.errorMessage.set(null);
    this.searchInputRef?.nativeElement.focus();
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const list = this.filteredIngredients();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!this.isDropdownOpen()) {
        this.isDropdownOpen.set(true);
      }
      const next = (this.focusedIndex() + 1) % (list.length || 1);
      this.focusedIndex.set(next);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = this.focusedIndex() <= 0 ? list.length - 1 : this.focusedIndex() - 1;
      this.focusedIndex.set(prev);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.focusedIndex();
      if (idx >= 0 && idx < list.length) {
        this.selectIngredient(list[idx]);
      } else if (this.searchQuery().trim()) {
        this.selectIngredient(this.searchQuery().trim());
      }
    } else if (event.key === 'Escape') {
      this.isDropdownOpen.set(false);
    }
  }

  selectIngredient(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;

    const current = this.ingredients();
    const exists = current.some(i => i.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      this.ingredients.update(items => [...items, trimmed]);
    }

    this.searchQuery.set('');
    this.isDropdownOpen.set(false);
    this.focusedIndex.set(-1);
    this.errorMessage.set(null);

    setTimeout(() => {
      this.searchInputRef?.nativeElement.focus();
    }, 50);
  }

  removeIngredient(nameToRemove: string): void {
    this.ingredients.update(items => items.filter(i => i !== nameToRemove));
  }

  setCategory(category: 'High Protein' | 'Quick 10-Min' | 'Nutrient Dense' | 'Smoothie & Detox'): void {
    this.selectedCategory.set(category);
  }

  setDietType(type: DietType): void {
    this.selectedDietType.set(type);
  }

  submitRecipe(): void {
    if (this.isSubmitting()) return;

    const name = this.recipeName().trim();
    const ings = this.ingredients();

    if (!name) {
      this.errorMessage.set('Please enter a recipe name.');
      this.nameInputRef?.nativeElement.focus();
      return;
    }

    if (ings.length === 0) {
      this.errorMessage.set('Please add at least one ingredient.');
      this.searchInputRef?.nativeElement.focus();
      return;
    }

    this.isSubmitting.set(true);
    try {
      const dest = this.destination();
      const day = this.targetDay();
      const slot = this.mealSlot();

      if (this.mode === 'edit') {
        if (this.editingAdditionalRecipe) {
          const updated = this.dietService.updateAdditionalRecipe({
            id: this.editingAdditionalRecipe.id,
            title: name,
            keyIngredients: ings,
            dietType: this.selectedDietType(),
            category: this.selectedCategory()
          });

          this.updatedAdditional.emit(updated);
          this.closeModal();
          return;
        }

        if (this.editingMeal) {
          this.dietService.updateScheduleRecipe({
            id: this.editingMeal.id,
            name,
            veggies: ings,
            day,
            slotId: slot,
            originalDay: this.activeDay,
            originalSlotId: this.initialSlot
          });

          this.updated.emit({
            id: this.editingMeal.id,
            name,
            veggies: ings,
            day,
            slotId: slot,
            originalDay: this.activeDay,
            originalSlotId: this.initialSlot
          });

          this.closeModal();
          return;
        }
      }

      let createdRecipe: AdditionalRecipe | undefined;
      let createdMeal: CustomDayMeal | undefined;

      if (dest === 'additional' || dest === 'both') {
        createdRecipe = this.dietService.addCustomRecipe({
          title: name,
          keyIngredients: ings,
          category: this.selectedCategory(),
          dietType: this.selectedDietType()
        });
      }

      if (dest === 'day_meal' || dest === 'both') {
        createdMeal = this.dietService.addCustomDayMeal({
          day,
          slotId: slot,
          name,
          veggies: ings
        });
      }

      this.added.emit({
        destination: dest,
        title: name,
        keyIngredients: ings,
        dietType: this.selectedDietType(),
        mealSlot: slot,
        day,
        additionalRecipe: createdRecipe,
        customMeal: createdMeal
      });

      this.closeModal();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  promptRemoveFromSchedule(): void {
    this.isConfirmRemoveOpen.set(true);
  }

  cancelRemoveFromSchedule(): void {
    this.isConfirmRemoveOpen.set(false);
  }

  onRemoveFromSchedule(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      this.isConfirmRemoveOpen.set(false);
      if (this.editingAdditionalRecipe) {
        const rec = this.editingAdditionalRecipe;
        this.dietService.removeAdditionalRecipe(rec.id);
        this.deletedAdditional.emit(rec);
        this.closeModal();
        return;
      }
      if (this.editingMeal) {
        this.removed.emit(this.editingMeal);
        this.closeModal();
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  closeModal(): void {
    this.unlockBodyScroll();
    this.isConfirmRemoveOpen.set(false);
    this.isSubmitting.set(false);
    this.recipeName.set('');
    this.ingredients.set([]);
    this.searchQuery.set('');
    this.isDropdownOpen.set(false);
    this.focusedIndex.set(-1);
    this.errorMessage.set(null);
    this.adjustNameInputHeight();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }
}
