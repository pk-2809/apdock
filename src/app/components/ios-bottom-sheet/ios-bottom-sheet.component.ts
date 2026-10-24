import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockAppService } from '../../core/services/dock-app.service';
import { HapticService } from '../../core/services/haptic.service';

@Component({
  selector: 'app-ios-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (dock.activeModal(); as modal) {
      <div 
        class="sheet-backdrop" 
        (click)="dock.closeSheet()"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="modal.title"
      >
        <!-- Modal Sheet Container with Double-Bezel Glass Material -->
        <div class="sheet-surface" (click)="$event.stopPropagation()">
          
          <!-- iOS Grabber Pill -->
          <div class="sheet-grabber-zone" (click)="dock.closeSheet()">
            <span class="sheet-grabber-pill"></span>
          </div>

          <!-- Sheet Header -->
          <div class="sheet-header">
            <div class="sheet-title-group">
              <h2 class="sheet-title">{{ modal.title }}</h2>
              <p class="sheet-subtitle">{{ modal.subtitle }}</p>
            </div>
            <button 
              type="button" 
              class="sheet-close-btn pressable" 
              (click)="dock.closeSheet()"
              aria-label="Close sheet"
            >
              ✕
            </button>
          </div>

          <!-- Dynamic Sheet Body Content -->
          <div class="sheet-scroll-body">
            @if (modal.type === 'family') {
              <div class="family-detail-view">
                <div class="section-lead">
                  <span>Live Locations & Battery Status</span>
                </div>
                <div class="family-members-cards">
                  @for (member of dock.familyMembers(); track member.id) {
                    <div class="member-detail-card">
                      <div class="detail-avatar">{{ member.avatarEmoji }}</div>
                      <div class="detail-info">
                        <strong>{{ member.name }}</strong>
                        <span class="detail-role">{{ member.role }} • {{ member.status | uppercase }}</span>
                      </div>
                      <div class="battery-chip">
                        <span>🔋 {{ member.battery }}%</span>
                      </div>
                    </div>
                  }
                </div>

                <div class="quick-ping-actions">
                  <button 
                    type="button" 
                    class="action-button-cta amber pressable" 
                    (click)="sendPingAlert('Dinner is ready! 🍲')"
                  >
                    <span>🍲 Ping: Dinner is ready</span>
                  </button>
                  <button 
                    type="button" 
                    class="action-button-cta secondary pressable" 
                    (click)="sendPingAlert('Heading home soon! 🚗')"
                  >
                    <span>🚗 Ping: Heading home</span>
                  </button>
                </div>
              </div>
            } @else if (modal.type === 'flow' || modal.type === 'new-task') {
              <div class="flow-detail-view">
                <div class="section-lead">
                  <span>Today's Complete Schedule</span>
                </div>
                <div class="tasks-expanded-list">
                  @for (task of dock.tasks(); track task.id) {
                    <div 
                      class="task-detail-row pressable"
                      [class.completed]="task.completed"
                      (click)="dock.toggleTask(task.id)"
                    >
                      <div class="task-circle-box" [class.checked]="task.completed">
                        @if (task.completed) { <span>✓</span> }
                      </div>
                      <div class="task-info">
                        <strong>{{ task.title }}</strong>
                        <span class="task-tag">{{ task.category | uppercase }} • {{ task.time }}</span>
                      </div>
                    </div>
                  }
                </div>

                <button 
                  type="button" 
                  class="action-button-cta emerald pressable" 
                  (click)="addNewQuickTask()"
                >
                  <span>＋ Add Quick Priority Task</span>
                </button>
              </div>
            } @else if (modal.type === 'health') {
              <div class="health-detail-view">
                <div class="metric-highlight-grid">
                  <div class="metric-card">
                    <span class="card-icon red">🔥</span>
                    <strong class="val">{{ dock.healthMetrics().caloriesBurned }}</strong>
                    <span class="lbl">Active Calories</span>
                  </div>
                  <div class="metric-card">
                    <span class="card-icon green">⚡</span>
                    <strong class="val">{{ dock.healthMetrics().activeMinutes }}m</strong>
                    <span class="lbl">Exercise Min</span>
                  </div>
                  <div class="metric-card">
                    <span class="card-icon cyan">🚶</span>
                    <strong class="val">{{ dock.healthMetrics().steps }}</strong>
                    <span class="lbl">Steps Today</span>
                  </div>
                </div>

                <div class="workout-action-box">
                  <button 
                    type="button" 
                    class="action-button-cta violet pressable" 
                    (click)="dock.setIslandMode('health'); dock.closeSheet()"
                  >
                    <span>⚡ Launch Workout Tracker</span>
                  </button>
                </div>
              </div>
            } @else if (modal.type === 'home') {
              <div class="home-detail-view">
                <div class="devices-detail-list">
                  @for (device of dock.homeDevices(); track device.id) {
                    <div 
                      class="device-detail-row pressable"
                      [class.active]="device.state"
                      (click)="dock.toggleDevice(device.id)"
                    >
                      <span class="device-emoji">{{ device.icon }}</span>
                      <div class="device-text">
                        <strong>{{ device.name }}</strong>
                        <span>{{ device.room }} • {{ device.value }}</span>
                      </div>
                      <div class="ios-switch-track" [class.on]="device.state">
                        <div class="ios-switch-thumb"></div>
                      </div>
                    </div>
                  }
                </div>

                <div class="home-scene-btns">
                  <button 
                    type="button" 
                    class="action-button-cta coral pressable" 
                    (click)="triggerScene('Night Mode')"
                  >
                    <span>🌙 Trigger Night Scene</span>
                  </button>
                </div>
              </div>
            }
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    .sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      z-index: 200;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      animation: backdropIn 0.25s ease-out;
    }

    @keyframes backdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .sheet-surface {
      background: var(--bg-surface-elevated);
      border-top: 1px solid var(--border-specular);
      border-radius: 36px 36px 0 0;
      box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.2);
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      padding: 8px 20px max(24px, var(--sab)) 20px;
      animation: sheetSlideUp 0.38s var(--spring-bounce);
      position: relative;
    }

    @keyframes sheetSlideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .sheet-grabber-zone {
      display: flex;
      justify-content: center;
      padding: 6px 0 12px 0;
      cursor: pointer;
    }

    .sheet-grabber-pill {
      width: 38px;
      height: 4.5px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.3);
    }

    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .sheet-title {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.3px;
    }

    .sheet-subtitle {
      font-size: 12px;
      color: var(--text-tertiary);
    }

    .sheet-close-btn {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.12);
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }

    .sheet-scroll-body {
      overflow-y: auto;
      max-height: 60vh;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-bottom: 8px;
    }

    .section-lead {
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-tertiary);
    }

    /* Family Detail View */
    .family-members-cards {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .member-detail-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .detail-avatar {
      font-size: 24px;
    }

    .detail-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .detail-role {
      font-size: 11px;
      color: var(--quad-family);
    }

    .battery-chip {
      font-size: 11.5px;
      font-family: var(--font-mono);
      color: var(--text-secondary);
    }

    .quick-ping-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }

    /* Action Button CTAs */
    .action-button-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 20px;
      border-radius: 18px;
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    }

    .action-button-cta.amber {
      background: var(--grad-family);
      box-shadow: 0 6px 20px rgba(255, 159, 10, 0.35);
    }

    .action-button-cta.emerald {
      background: var(--grad-flow);
      box-shadow: 0 6px 20px rgba(48, 209, 88, 0.35);
    }

    .action-button-cta.violet {
      background: var(--grad-health);
      box-shadow: 0 6px 20px rgba(94, 92, 230, 0.35);
    }

    .action-button-cta.coral {
      background: var(--grad-home);
      box-shadow: 0 6px 20px rgba(255, 59, 48, 0.35);
    }

    .action-button-cta.secondary {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }

    /* Tasks Expanded */
    .tasks-expanded-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .task-detail-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }

    .task-detail-row.completed {
      opacity: 0.55;
    }

    .task-circle-box {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: #fff;
    }

    .task-circle-box.checked {
      background: var(--grad-flow);
      border-color: var(--quad-flow);
    }

    .task-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .task-tag {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    /* Metric Highlight Grid */
    .metric-highlight-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .metric-card {
      padding: 14px 10px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      text-align: center;
    }

    .card-icon {
      font-size: 20px;
    }

    .metric-card .val {
      font-size: 16px;
      font-family: var(--font-mono);
      font-weight: 700;
    }

    .metric-card .lbl {
      font-size: 10px;
      color: var(--text-tertiary);
    }

    /* Device Detail Row & Switch */
    .devices-detail-list {
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .device-detail-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.07);
    }

    .device-detail-row.active {
      border-color: rgba(255, 59, 48, 0.35);
      background: rgba(255, 59, 48, 0.08);
    }

    .device-emoji {
      font-size: 22px;
    }

    .device-text {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .device-text span {
      font-size: 11px;
      color: var(--text-tertiary);
    }

    .ios-switch-track {
      width: 44px;
      height: 26px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.2);
      padding: 2px;
      transition: background 0.25s ease;
      position: relative;
    }

    .ios-switch-track.on {
      background: var(--quad-flow);
    }

    .ios-switch-thumb {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35);
      transition: transform 0.25s var(--spring-bounce);
    }

    .ios-switch-track.on .ios-switch-thumb {
      transform: translateX(18px);
    }
  `]
})
export class IosBottomSheetComponent {
  dock = inject(DockAppService);
  haptics = inject(HapticService);

  sendPingAlert(message: string): void {
    this.dock.sendFamilyPing();
    this.dock.closeSheet();
  }

  addNewQuickTask(): void {
    const newTask = {
      id: 't_' + Date.now(),
      title: 'Quick reminder: Check apdock status',
      time: 'Just now',
      category: 'flow' as const,
      completed: false
    };
    this.dock.tasks.update(t => [newTask, ...t]);
    this.haptics.trigger('success');
  }

  triggerScene(name: string): void {
    this.haptics.trigger('success');
    this.dock.closeSheet();
  }
}
