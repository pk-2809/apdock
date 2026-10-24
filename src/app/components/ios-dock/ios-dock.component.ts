import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockAppService } from '../../core/services/dock-app.service';
import { HapticService } from '../../core/services/haptic.service';

@Component({
  selector: 'app-ios-dock',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="liquid-dock-wrapper" role="navigation" aria-label="Bottom Navigation Dock">
      <!-- Apple Glass Floating Capsule Container -->
      <div class="dock-capsule glass-material">
        
        <!-- Tab 1: Family -->
        <button 
          type="button" 
          class="dock-item pressable"
          [class.active]="dock.selectedCategory() === 'family'"
          (click)="dock.setCategory('family')"
          aria-label="Family Category"
        >
          <div class="icon-squircle amber">
            <span class="icon">👨‍👩‍👧</span>
            <span class="dock-badge">{{ dock.familyHomeCount() }}</span>
          </div>
          <span class="dock-label">Family</span>
        </button>

        <!-- Tab 2: Flow -->
        <button 
          type="button" 
          class="dock-item pressable"
          [class.active]="dock.selectedCategory() === 'flow'"
          (click)="dock.setCategory('flow')"
          aria-label="Daily Flow Category"
        >
          <div class="icon-squircle emerald">
            <span class="icon">🗓</span>
            <span class="dock-badge">{{ dock.completedTasksCount() }}</span>
          </div>
          <span class="dock-label">Flow</span>
        </button>

        <!-- Tab 3: Center Highlight Quick Action (+) with Brand Roof Gradient -->
        <button 
          type="button" 
          class="dock-item center-cta pressable"
          (click)="onCenterAction()"
          aria-label="Quick Action"
        >
          <div class="center-bezel">
            <span class="plus-icon">＋</span>
          </div>
        </button>

        <!-- Tab 4: Health -->
        <button 
          type="button" 
          class="dock-item pressable"
          [class.active]="dock.selectedCategory() === 'health'"
          (click)="dock.setCategory('health')"
          aria-label="Health Category"
        >
          <div class="icon-squircle violet">
            <span class="icon">⚡</span>
          </div>
          <span class="dock-label">Health</span>
        </button>

        <!-- Tab 5: Home -->
        <button 
          type="button" 
          class="dock-item pressable"
          [class.active]="dock.selectedCategory() === 'home'"
          (click)="dock.setCategory('home')"
          aria-label="Living Home Category"
        >
          <div class="icon-squircle coral">
            <span class="icon">🏡</span>
          </div>
          <span class="dock-label">Home</span>
        </button>

      </div>

      <!-- iPhone Home Indicator Bar -->
      <div class="home-indicator-bar" aria-hidden="true"></div>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 95;
      pointer-events: none;
    }

    .liquid-dock-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      padding-bottom: max(8px, var(--sab));
      pointer-events: none;
    }

    /* Apple Liquid Glass Floating Capsule */
    .dock-capsule {
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: space-around;
      width: min(92vw, 370px);
      height: 68px;
      border-radius: 34px;
      padding: 0 12px;
      box-shadow: 
        0 14px 40px -4px rgba(0, 0, 0, 0.7),
        0 0 1px 1px rgba(255, 255, 255, 0.18) inset,
        0 2px 8px rgba(0, 132, 255, 0.15);
      position: relative;
    }

    .dock-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 4px;
      transition: transform 0.2s var(--spring-bounce);
      position: relative;
    }

    .dock-item.active .icon-squircle {
      transform: translateY(-3px) scale(1.06);
    }

    .icon-squircle {
      width: 40px;
      height: 40px;
      border-radius: 13px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      position: relative;
      transition: all 0.25s var(--spring-bounce);
    }

    .icon-squircle.amber {
      background: rgba(255, 159, 10, 0.14);
      border-color: rgba(255, 159, 10, 0.3);
    }
    .dock-item.active .icon-squircle.amber {
      box-shadow: 0 6px 16px rgba(255, 159, 10, 0.4);
      background: var(--grad-family);
    }

    .icon-squircle.emerald {
      background: rgba(48, 209, 88, 0.14);
      border-color: rgba(48, 209, 88, 0.3);
    }
    .dock-item.active .icon-squircle.emerald {
      box-shadow: 0 6px 16px rgba(48, 209, 88, 0.4);
      background: var(--grad-flow);
    }

    .icon-squircle.violet {
      background: rgba(94, 92, 230, 0.14);
      border-color: rgba(94, 92, 230, 0.3);
    }
    .dock-item.active .icon-squircle.violet {
      box-shadow: 0 6px 16px rgba(94, 92, 230, 0.4);
      background: var(--grad-health);
    }

    .icon-squircle.coral {
      background: rgba(255, 59, 48, 0.14);
      border-color: rgba(255, 59, 48, 0.3);
    }
    .dock-item.active .icon-squircle.coral {
      box-shadow: 0 6px 16px rgba(255, 59, 48, 0.4);
      background: var(--grad-home);
    }

    .dock-badge {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #ff3b30;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid var(--bg-surface);
    }

    .dock-label {
      font-size: 9.5px;
      font-weight: 600;
      color: var(--text-tertiary);
      letter-spacing: -0.1px;
    }

    .dock-item.active .dock-label {
      color: #ffffff;
      font-weight: 700;
    }

    /* Center Highlight (+) Button with Roof Gradient */
    .center-cta {
      margin-top: -12px;
    }

    .center-bezel {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--grad-roof);
      box-shadow: 0 8px 22px rgba(0, 132, 255, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.4);
      border: 2px solid rgba(255, 255, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s var(--spring-bounce);
    }

    .center-cta:active .center-bezel {
      transform: scale(0.92);
    }

    .plus-icon {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      line-height: 1;
    }

    /* iPhone Home Indicator Pill */
    .home-indicator-bar {
      width: 134px;
      height: 4.5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.35);
      margin-top: 6px;
    }
  `]
})
export class IosDockComponent {
  dock = inject(DockAppService);
  haptics = inject(HapticService);

  onCenterAction(): void {
    this.haptics.trigger('pop');
    this.dock.openSheet('flow', 'Quick Action Hub', 'Add tasks, trigger routines or ping devices');
  }
}
