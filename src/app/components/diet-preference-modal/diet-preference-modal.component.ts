import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DietService, DietGoal, DietType } from '../../core/services/diet.service';

@Component({
  selector: 'app-diet-preference-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diet-preference-modal.component.html',
  styleUrl: './diet-preference-modal.component.css'
})
export class DietPreferenceModalComponent {
  private readonly dietService = inject(DietService);

  @Input() isOpen = false;
  @Input() initialGoal?: DietGoal;
  @Input() initialDietType?: DietType;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<{ goal: DietGoal; dietType: DietType }>();

  readonly selectedGoal = signal<DietGoal>('loss');
  readonly selectedDietType = signal<DietType>('veg');
  readonly isSaving = signal<boolean>(false);

  ngOnInit(): void {
    const existing = this.dietService.preference();
    if (this.initialGoal) {
      this.selectedGoal.set(this.initialGoal);
    } else if (existing?.goal) {
      this.selectedGoal.set(existing.goal);
    }

    if (this.initialDietType) {
      this.selectedDietType.set(this.initialDietType);
    } else if (existing?.dietType) {
      this.selectedDietType.set(existing.dietType);
    }
  }

  setGoal(goal: DietGoal): void {
    this.selectedGoal.set(goal);
  }

  setDietType(type: DietType): void {
    this.selectedDietType.set(type);
  }

  isVegSelected(): boolean {
    const current = this.selectedDietType();
    return current === 'veg' || current === 'both';
  }

  isNonVegSelected(): boolean {
    const current = this.selectedDietType();
    return current === 'nonveg' || current === 'both';
  }

  isBothSelected(): boolean {
    return this.selectedDietType() === 'both';
  }

  toggleVeg(): void {
    const current = this.selectedDietType();
    if (current === 'both') {
      this.selectedDietType.set('nonveg');
    } else if (current === 'nonveg') {
      this.selectedDietType.set('both');
    } else {
      this.selectedDietType.set('veg');
    }
  }

  toggleNonVeg(): void {
    const current = this.selectedDietType();
    if (current === 'both') {
      this.selectedDietType.set('veg');
    } else if (current === 'veg') {
      this.selectedDietType.set('both');
    } else {
      this.selectedDietType.set('nonveg');
    }
  }

  selectBoth(): void {
    if (this.selectedDietType() === 'both') {
      this.selectedDietType.set('veg');
    } else {
      this.selectedDietType.set('both');
    }
  }

  async onConfirm(): Promise<void> {
    this.isSaving.set(true);
    const goal = this.selectedGoal();
    const dietType = this.selectedDietType();
    try {
      await this.dietService.savePreference(goal, dietType);
      this.saved.emit({ goal, dietType });
      this.close.emit();
    } finally {
      this.isSaving.set(false);
    }
  }

  onDismiss(): void {
    this.close.emit();
  }
}
