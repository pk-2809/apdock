import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockAppService } from '../../core/services/dock-app.service';
import { HapticService } from '../../core/services/haptic.service';

@Component({
  selector: 'app-quadrant-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="quadrants-wrapper" role="main">

      <!-- ========================================================
           QUADRANT 1: FAMILY & COMMUNITY (WARM AMBER)
           ======================================================== -->
      @if (shouldShow('family')) {
        <section 
          class="quadrant-card double-bezel family-card pressable"
          (click)="openFamilySheet()"
          tabindex="0"
          role="region"
          aria-label="Family and Community quadrant"
        >
          <div class="card-glow amber-glow"></div>
          
          <div class="card-inner-header">
            <div class="header-badge-row">
              <div class="quad-icon-badge amber-badge">
                <span class="badge-icon">👨‍👩‍👧</span>
              </div>
              <span class="quad-pill-tag amber-tag">{{ dock.familyHomeCount() }} at Home</span>
            </div>
            <h2 class="card-title">Family Space</h2>
            <p class="card-subtitle">Presence & Shared Routine</p>
          </div>

          <div class="card-content-body">
            <!-- Member Avatars with Live Status -->
            <div class="family-avatars-row">
              @for (member of dock.familyMembers(); track member.id) {
                <div class="avatar-capsule" [title]="member.name + ' (' + member.status + ')'">
                  <div class="avatar-ring" [class.is-home]="member.status === 'home'">
                    <span class="avatar-emoji">{{ member.avatarEmoji }}</span>
                    <span class="status-pip" [class.online]="member.status === 'home'"></span>
                  </div>
                  <span class="member-name">{{ member.name }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Card Footer with Haptic Quick Ping -->
          <div class="card-footer-action">
            <button 
              type="button" 
              class="quad-action-btn amber-btn pressable"
              (click)="$event.stopPropagation(); dock.sendFamilyPing()"
            >
              <span>👋 Send Family Ping</span>
            </button>
            <span class="card-arrow-indicator">➔</span>
          </div>
        </section>
      }

      <!-- ========================================================
           QUADRANT 2: DAILY FLOW & TASKS (EMERALD MINT)
           ======================================================== -->
      @if (shouldShow('flow')) {
        <section 
          class="quadrant-card double-bezel flow-card pressable"
          (click)="openFlowSheet()"
          tabindex="0"
          role="region"
          aria-label="Daily Flow and Tasks quadrant"
        >
          <div class="card-glow emerald-glow"></div>

          <div class="card-inner-header">
            <div class="header-badge-row">
              <div class="quad-icon-badge emerald-badge">
                <span class="badge-icon">🗓</span>
              </div>
              <span class="quad-pill-tag emerald-tag">{{ dock.completedTasksCount() }}/{{ dock.tasks().length }} Done</span>
            </div>
            <h2 class="card-title">Daily Flow</h2>
            <p class="card-subtitle">Habits & Priorities</p>
          </div>

          <div class="card-content-body">
            <!-- Interactive Task List with Real Haptic Checkboxes -->
            <div class="task-compact-list">
              @for (task of dock.tasks().slice(0, 3); track task.id) {
                <div 
                  class="task-row pressable"
                  [class.is-done]="task.completed"
                  (click)="$event.stopPropagation(); dock.toggleTask(task.id)"
                  role="checkbox"
                  [attr.aria-checked]="task.completed"
                >
                  <div class="task-checkbox" [class.checked]="task.completed">
                    @if (task.completed) { <span>✓</span> }
                  </div>
                  <span class="task-title-text">{{ task.title }}</span>
                  <span class="task-time-badge">{{ task.time }}</span>
                </div>
              }
            </div>
          </div>

          <div class="card-footer-action">
            <div class="streak-indicator">
              <span class="streak-flame">🔥</span>
              <span class="streak-val">18 Days Streak</span>
            </div>
            <span class="card-arrow-indicator">➔</span>
          </div>
        </section>
      }

      <!-- ========================================================
           QUADRANT 3: HEALTH & FITNESS (ELECTRIC VIOLET)
           ======================================================== -->
      @if (shouldShow('health')) {
        <section 
          class="quadrant-card double-bezel health-card pressable"
          (click)="openHealthSheet()"
          tabindex="0"
          role="region"
          aria-label="Health and Fitness quadrant"
        >
          <div class="card-glow violet-glow"></div>

          <div class="card-inner-header">
            <div class="header-badge-row">
              <div class="quad-icon-badge violet-badge">
                <span class="badge-icon">⚡</span>
              </div>
              <span class="quad-pill-tag violet-tag">Rings 83%</span>
            </div>
            <h2 class="card-title">Activity Rings</h2>
            <p class="card-subtitle">Bio-Metrics & Cardio</p>
          </div>

          <div class="card-content-body">
            <!-- Apple-style Triple Ring SVG Visualizer -->
            <div class="rings-showcase-row">
              <div class="svg-rings-box">
                <svg viewBox="0 0 100 100" class="activity-rings-svg" aria-label="Activity rings">
                  <!-- Outer Move Ring (Coral Red) -->
                  <circle cx="50" cy="50" r="40" class="ring-bg" stroke="rgba(255, 59, 48, 0.2)" stroke-width="8" fill="none"/>
                  <circle cx="50" cy="50" r="40" class="ring-fg move-ring" stroke="var(--quad-home)" stroke-width="8" stroke-dasharray="251.2" stroke-dashoffset="45" stroke-linecap="round" fill="none"/>

                  <!-- Middle Exercise Ring (Mint Green) -->
                  <circle cx="50" cy="50" r="28" class="ring-bg" stroke="rgba(48, 209, 88, 0.2)" stroke-width="8" fill="none"/>
                  <circle cx="50" cy="50" r="28" class="ring-fg exercise-ring" stroke="var(--quad-flow)" stroke-width="8" stroke-dasharray="175.9" stroke-dashoffset="30" stroke-linecap="round" fill="none"/>

                  <!-- Inner Stand Ring (Sky/Cyan Blue) -->
                  <circle cx="50" cy="50" r="16" class="ring-bg" stroke="rgba(0, 198, 255, 0.2)" stroke-width="8" fill="none"/>
                  <circle cx="50" cy="50" r="16" class="ring-fg stand-ring" stroke="var(--brand-cyan)" stroke-width="8" stroke-dasharray="100.5" stroke-dashoffset="18" stroke-linecap="round" fill="none"/>
                </svg>
              </div>

              <!-- Stats Column -->
              <div class="health-stats-col">
                <div class="stat-item move-stat">
                  <span class="stat-dot red-dot"></span>
                  <span class="stat-label">Move:</span>
                  <strong class="stat-num">{{ dock.healthMetrics().caloriesBurned }} kcal</strong>
                </div>
                <div class="stat-item exercise-stat">
                  <span class="stat-dot green-dot"></span>
                  <span class="stat-label">Exercise:</span>
                  <strong class="stat-num">{{ dock.healthMetrics().activeMinutes }}m</strong>
                </div>
                <div class="stat-item stand-stat">
                  <span class="stat-dot cyan-dot"></span>
                  <span class="stat-label">Stand:</span>
                  <strong class="stat-num">{{ dock.healthMetrics().standHours }}h</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="card-footer-action">
            <div class="heart-pulse-chip">
              <span class="pulse-heart">💓</span>
              <span class="heart-rate-text">{{ dock.healthMetrics().heartRate }} BPM</span>
            </div>
            <span class="card-arrow-indicator">➔</span>
          </div>
        </section>
      }

      <!-- ========================================================
           QUADRANT 4: SMART HOME & LIVING (CORAL SUNSET)
           ======================================================== -->
      @if (shouldShow('home')) {
        <section 
          class="quadrant-card double-bezel home-card pressable"
          (click)="openHomeSheet()"
          tabindex="0"
          role="region"
          aria-label="Smart Home and Living quadrant"
        >
          <div class="card-glow coral-glow"></div>

          <div class="card-inner-header">
            <div class="header-badge-row">
              <div class="quad-icon-badge coral-badge">
                <span class="badge-icon">🏡</span>
              </div>
              <span class="quad-pill-tag coral-tag">3 Active</span>
            </div>
            <h2 class="card-title">Living Space</h2>
            <p class="card-subtitle">Ambient Environment & Security</p>
          </div>

          <div class="card-content-body">
            <!-- Quick Toggle Device Tiles with Physical Haptic Click -->
            <div class="devices-grid-mini">
              @for (device of dock.homeDevices().slice(0, 4); track device.id) {
                <div 
                  class="device-chip pressable"
                  [class.active]="device.state"
                  (click)="$event.stopPropagation(); dock.toggleDevice(device.id)"
                  role="switch"
                  [attr.aria-checked]="device.state"
                >
                  <div class="device-icon-row">
                    <span class="chip-icon">{{ device.icon }}</span>
                    <span class="chip-switch-pip" [class.on]="device.state"></span>
                  </div>
                  <span class="chip-name">{{ device.name }}</span>
                  <span class="chip-status">{{ device.value }}</span>
                </div>
              }
            </div>
          </div>

          <div class="card-footer-action">
            <div class="climate-badge">
              <span>❄️ Climate Auto • 71°F Eco</span>
            </div>
            <span class="card-arrow-indicator">➔</span>
          </div>
        </section>
      }

    </main>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .quadrants-wrapper {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      padding: 6px 18px 100px 18px;
    }

    @media (min-width: 600px) {
      .quadrants-wrapper {
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
      }
    }

    /* Quadrant Card Doppelrand Structure */
    .quadrant-card {
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 200px;
      cursor: pointer;
      position: relative;
    }

    /* Ambient Glow Behind Quadrants */
    .card-glow {
      position: absolute;
      width: 140px;
      height: 140px;
      top: -30px;
      right: -30px;
      border-radius: 50%;
      filter: blur(55px);
      pointer-events: none;
      opacity: 0.22;
      transition: opacity 0.3s ease;
    }

    .quadrant-card:hover .card-glow {
      opacity: 0.38;
    }

    .amber-glow { background: var(--quad-family); }
    .emerald-glow { background: var(--quad-flow); }
    .violet-glow { background: var(--quad-health); }
    .coral-glow { background: var(--quad-home); }

    /* Header & Badges */
    .card-inner-header {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .header-badge-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .quad-icon-badge {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.25);
    }

    .amber-badge { background: var(--grad-family); }
    .emerald-badge { background: var(--grad-flow); }
    .violet-badge { background: var(--grad-health); }
    .coral-badge { background: var(--grad-home); }

    .quad-pill-tag {
      font-size: 11px;
      font-weight: 700;
      padding: 4px 9px;
      border-radius: 999px;
      letter-spacing: 0.3px;
    }

    .amber-tag { background: rgba(255, 159, 10, 0.16); color: #ffb703; border: 1px solid rgba(255, 159, 10, 0.3); }
    .emerald-tag { background: rgba(48, 209, 88, 0.16); color: #30d158; border: 1px solid rgba(48, 209, 88, 0.3); }
    .violet-tag { background: rgba(94, 92, 230, 0.16); color: #a78bfa; border: 1px solid rgba(94, 92, 230, 0.3); }
    .coral-tag { background: rgba(255, 59, 48, 0.16); color: #ff5e62; border: 1px solid rgba(255, 59, 48, 0.3); }

    .card-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #ffffff;
    }

    .card-subtitle {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .card-content-body {
      margin: 14px 0;
    }

    /* Family Avatars Row */
    .family-avatars-row {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding: 4px 2px;
      scrollbar-width: none;
    }

    .avatar-capsule {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .avatar-ring {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      border: 2px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .avatar-ring.is-home {
      border-color: var(--quad-family);
      box-shadow: 0 0 10px rgba(255, 159, 10, 0.4);
    }

    .avatar-emoji {
      font-size: 20px;
    }

    .status-pip {
      position: absolute;
      bottom: -1px;
      right: -1px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #8e8e93;
      border: 2px solid var(--bg-surface);
    }

    .status-pip.online {
      background: var(--quad-flow);
      box-shadow: 0 0 6px var(--quad-flow);
    }

    .member-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    /* Flow Task Rows */
    .task-compact-list {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    .task-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .task-row.is-done {
      opacity: 0.6;
    }

    .task-checkbox {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 1.5px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      color: #fff;
    }

    .task-checkbox.checked {
      background: var(--grad-flow);
      border-color: var(--quad-flow);
      box-shadow: 0 0 8px rgba(48, 209, 88, 0.5);
    }

    .task-title-text {
      flex: 1;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-row.is-done .task-title-text {
      text-decoration: line-through;
      color: var(--text-tertiary);
    }

    .task-time-badge {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--text-tertiary);
    }

    /* Health Rings Showcase */
    .rings-showcase-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .svg-rings-box {
      width: 82px;
      height: 82px;
      flex-shrink: 0;
    }

    .activity-rings-svg {
      transform: rotate(-90deg);
      width: 100%;
      height: 100%;
    }

    .ring-fg {
      transition: stroke-dashoffset 0.8s var(--spring-bounce);
    }

    .health-stats-col {
      display: flex;
      flex-direction: column;
      gap: 5px;
      flex: 1;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }

    .stat-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .red-dot { background: var(--quad-home); box-shadow: 0 0 6px var(--quad-home); }
    .green-dot { background: var(--quad-flow); box-shadow: 0 0 6px var(--quad-flow); }
    .cyan-dot { background: var(--brand-cyan); box-shadow: 0 0 6px var(--brand-cyan); }

    .stat-label {
      color: var(--text-tertiary);
      font-size: 11px;
    }

    .stat-num {
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 11.5px;
      margin-left: auto;
    }

    /* Home Devices Grid Mini */
    .devices-grid-mini {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .device-chip {
      padding: 9px 10px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.07);
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .device-chip.active {
      background: rgba(255, 59, 48, 0.12);
      border-color: rgba(255, 59, 48, 0.35);
    }

    .device-icon-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .chip-icon {
      font-size: 15px;
    }

    .chip-switch-pip {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.25);
    }

    .chip-switch-pip.on {
      background: var(--quad-home);
      box-shadow: 0 0 6px var(--quad-home);
    }

    .chip-name {
      font-size: 11.5px;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chip-status {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    /* Card Footer Action Bar */
    .card-footer-action {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 10px;
      margin-top: 4px;
    }

    .card-arrow-indicator {
      font-size: 13px;
      color: var(--text-tertiary);
      transition: transform 0.2s ease, color 0.2s ease;
    }

    .quadrant-card:hover .card-arrow-indicator {
      transform: translateX(3px);
      color: #fff;
    }

    .quad-action-btn {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 11.5px;
      font-weight: 700;
    }

    .amber-btn {
      background: rgba(255, 159, 10, 0.2);
      color: #ffb703;
      border: 1px solid rgba(255, 159, 10, 0.35);
    }

    .streak-indicator, .heart-pulse-chip, .climate-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .pulse-heart {
      animation: heartbeat 1.2s infinite ease-in-out;
    }

    @keyframes heartbeat {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.22); }
    }
  `]
})
export class QuadrantGridComponent {
  dock = inject(DockAppService);
  haptics = inject(HapticService);

  shouldShow(cat: 'family' | 'flow' | 'health' | 'home'): boolean {
    const active = this.dock.selectedCategory();
    return active === 'all' || active === cat;
  }

  openFamilySheet(): void {
    this.dock.openSheet('family', 'Family & Community', 'Presence, Calendar & Direct Pings');
  }

  openFlowSheet(): void {
    this.dock.openSheet('flow', 'Daily Flow & Tasks', 'Routines, Habits & Task Execution');
  }

  openHealthSheet(): void {
    this.dock.openSheet('health', 'Health & Bio-Metrics', 'Activity Rings, Heart Rate & Energy');
  }

  openHomeSheet(): void {
    this.dock.openSheet('home', 'Living Space & IoT', 'Climate, Ambient Light & Access Security');
  }
}
