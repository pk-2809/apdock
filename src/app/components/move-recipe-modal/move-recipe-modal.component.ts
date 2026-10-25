import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  signal,
  HostListener,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdditionalRecipe, DayOfWeek } from '../../core/services/diet.service';

@Component({
  selector: 'app-move-recipe-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './move-recipe-modal.component.html',
  styleUrl: './move-recipe-modal.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MoveRecipeModalComponent implements OnInit, OnDestroy {
  @Input({ required: true }) recipe!: AdditionalRecipe;
  @Input() activeDay: DayOfWeek = 'Monday';
  @Input() activeSlot: 'breakfast' | 'lunch' | 'dinner' = 'lunch';

  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<AdditionalRecipe>();
  @Output() moved = new EventEmitter<{
    recipe: AdditionalRecipe;
    slotId: 'breakfast' | 'lunch' | 'dinner';
    applyToAllDays: boolean;
  }>();

  readonly selectedSlot = signal<'breakfast' | 'lunch' | 'dinner'>('lunch');

  ngOnInit(): void {
    if (this.activeSlot) {
      this.selectedSlot.set(this.activeSlot);
    }
    this.lockBodyScroll();
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeModal();
  }

  setSlot(slot: 'breakfast' | 'lunch' | 'dinner'): void {
    this.selectedSlot.set(slot);
  }

  confirmMove(): void {
    this.moved.emit({
      recipe: this.recipe,
      slotId: this.selectedSlot(),
      applyToAllDays: false
    });
  }

  onEdit(): void {
    this.unlockBodyScroll();
    this.edit.emit(this.recipe);
  }

  closeModal(): void {
    this.unlockBodyScroll();
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
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
}
