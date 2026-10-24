import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockAppService } from '../../core/services/dock-app.service';
import { HapticService } from '../../core/services/haptic.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="app-header-container">
      <div class="brand-hero-block">
        <!-- Double-bezel App Logo Squircle -->
        <div 
          class="logo-bezel pressable" 
          (click)="onLogoClick()"
          role="button"
          tabindex="0"
          aria-label="Apdock Home Hub"
        >
          <img src="app-icon.png" alt="Apdock Logo" class="brand-logo-img" />
          <div class="logo-specular-ring"></div>
        </div>

        <div class="brand-titles">
          <div class="title-row">
            <h1 class="brand-name">apdock</h1>
            <span class="ios-hub-badge">iOS Hub</span>
          </div>
          <p class="brand-tagline">Integrated Life & Space Controller</p>
        </div>
      </div>

      <!-- Quick Action Controls: Haptics & Island Mode Switcher -->
      <div class="header-actions">
        <!-- Haptic Sound Feedback Toggle -->
        <button 
          type="button" 
          class="icon-action-btn pressable" 
          [class.active]="haptics.isSoundEnabled()"
          (click)="haptics.toggleSound()"
          aria-label="Toggle haptic sounds"
          [title]="haptics.isSoundEnabled() ? 'Haptic Sound: Enabled' : 'Haptic Sound: Muted'"
        >
          <span class="btn-icon">{{ haptics.isSoundEnabled() ? '🔔' : '🔕' }}</span>
        </button>

        <!-- Quick Dynamic Island Switcher Pill -->
        <button 
          type="button" 
          class="island-switcher-btn pressable"
          (click)="cycleIslandMode()"
          aria-label="Cycle Dynamic Island Activity"
          title="Switch Dynamic Island State"
        >
          <span class="switcher-dot"></span>
          <span class="switcher-label">{{ getIslandLabel() }}</span>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .app-header-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 18px;
      gap: 12px;
    }

    .brand-hero-block {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    /* Double-bezel Machined Hardware Frame for App Logo */
    .logo-bezel {
      position: relative;
      width: 50px;
      height: 50px;
      border-radius: 16px;
      padding: 2px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.05) 100%);
      box-shadow: 0 8px 24px -4px rgba(0, 132, 255, 0.45), 0 0 1px 1px rgba(255, 255, 255, 0.2) inset;
      cursor: pointer;
      flex-shrink: 0;
    }

    .brand-logo-img {
      width: 100%;
      height: 100%;
      border-radius: 14px;
      object-fit: cover;
      display: block;
    }

    .logo-specular-ring {
      position: absolute;
      inset: 0;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.35);
      pointer-events: none;
    }

    .brand-titles {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .brand-name {
      font-size: 21px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      background: linear-gradient(180deg, #ffffff 40%, rgba(255, 255, 255, 0.75) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .ios-hub-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(0, 132, 255, 0.18);
      color: var(--brand-cyan);
      border: 1px solid rgba(0, 198, 255, 0.3);
    }

    .brand-tagline {
      font-size: 11.5px;
      color: var(--text-tertiary);
      font-weight: 500;
    }

    /* Actions */
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .icon-action-btn {
      width: 38px;
      height: 38px;
      border-radius: 13px;
      background: var(--bg-surface-elevated);
      border: 1px solid var(--border-specular);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      font-size: 15px;
    }

    .icon-action-btn.active {
      border-color: rgba(0, 198, 255, 0.4);
      background: rgba(0, 132, 255, 0.12);
    }

    .island-switcher-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--bg-glass-island);
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .switcher-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--brand-cyan);
      box-shadow: 0 0 8px var(--brand-cyan);
      animation: pulseDot 2s infinite ease-in-out;
    }

    @keyframes pulseDot {
      0%, 100% { transform: scale(1); opacity: 0.8; }
      50% { transform: scale(1.3); opacity: 1; }
    }

    .switcher-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-secondary);
      letter-spacing: 0.2px;
    }
  `]
})
export class AppHeaderComponent {
  dock = inject(DockAppService);
  haptics = inject(HapticService);

  onLogoClick(): void {
    this.haptics.trigger('pop');
    this.dock.toggleDynamicIsland();
  }

  cycleIslandMode(): void {
    const modes: Array<'music' | 'timer' | 'family' | 'health'> = ['music', 'timer', 'family', 'health'];
    const currentIdx = modes.indexOf(this.dock.islandMode() as any);
    const nextIdx = (currentIdx + 1) % modes.length;
    this.dock.setIslandMode(modes[nextIdx]);
  }

  getIslandLabel(): string {
    switch (this.dock.islandMode()) {
      case 'music': return 'Music';
      case 'timer': return 'Focus';
      case 'family': return 'Family';
      case 'health': return 'Health';
      default: return 'Island';
    }
  }
}
