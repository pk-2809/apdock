import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockAppService, CategoryFilter } from '../../core/services/dock-app.service';
import { HapticService } from '../../core/services/haptic.service';

interface FilterOption {
  key: CategoryFilter;
  label: string;
  icon: string;
  colorVar: string;
}

@Component({
  selector: 'app-segmented-filter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="segmented-track" role="tablist" aria-label="Life quadrant filter">
      @for (opt of options; track opt.key) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="dock.selectedCategory() === opt.key"
          class="segment-item pressable"
          [class.active]="dock.selectedCategory() === opt.key"
          [style.--active-color]="opt.colorVar"
          (click)="select(opt.key)"
        >
          <span class="tab-icon">{{ opt.icon }}</span>
          <span class="tab-label">{{ opt.label }}</span>
        </button>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      padding: 0 18px 8px 18px;
    }

    .segmented-track {
      display: flex;
      align-items: center;
      background: rgba(22, 28, 48, 0.7);
      border: 1px solid var(--border-specular);
      border-radius: 999px;
      padding: 3.5px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.08);
      position: relative;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .segmented-track::-webkit-scrollbar {
      display: none;
    }

    .segment-item {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-tertiary);
      transition: all 0.24s var(--spring-bounce);
      white-space: nowrap;
      position: relative;
      z-index: 1;
    }

    .segment-item.active {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.12);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.25);
    }

    .segment-item.active .tab-icon {
      filter: drop-shadow(0 0 6px var(--active-color, #fff));
    }

    .tab-icon {
      font-size: 13px;
      transition: transform 0.2s ease;
    }

    .segment-item:active .tab-icon {
      transform: scale(0.9);
    }

    .tab-label {
      letter-spacing: -0.1px;
    }
  `]
})
export class SegmentedFilterComponent {
  dock = inject(DockAppService);
  haptics = inject(HapticService);

  readonly options: FilterOption[] = [
    { key: 'all', label: 'All', icon: '✦', colorVar: 'var(--brand-cyan)' },
    { key: 'family', label: 'Family', icon: '👨‍👩‍👧', colorVar: 'var(--quad-family)' },
    { key: 'flow', label: 'Flow', icon: '🗓', colorVar: 'var(--quad-flow)' },
    { key: 'health', label: 'Health', icon: '⚡', colorVar: 'var(--quad-health)' },
    { key: 'home', label: 'Home', icon: '🏡', colorVar: 'var(--quad-home)' }
  ];

  select(key: CategoryFilter): void {
    this.dock.setCategory(key);
  }
}
