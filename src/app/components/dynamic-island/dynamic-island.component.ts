import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DockAppService } from '../../core/services/dock-app.service';
import { HapticService } from '../../core/services/haptic.service';

@Component({
  selector: 'app-dynamic-island',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="island-container"
      [class.expanded]="dock.isIslandExpanded()"
      (click)="onIslandClick($event)"
      tabindex="0"
      role="region"
      aria-label="Dynamic Island Notification Area"
    >
      <!-- COMPACT IDLE STATE -->
      @if (!dock.isIslandExpanded()) {
        <div class="compact-view">
          <div class="compact-leading">
            @if (dock.islandMode() === 'music') {
              <div class="audio-wave-mini">
                <span class="bar bar-1"></span>
                <span class="bar bar-2"></span>
                <span class="bar bar-3"></span>
              </div>
            } @else if (dock.islandMode() === 'timer') {
              <span class="compact-icon timer-icon">⏱️</span>
            } @else if (dock.islandMode() === 'family') {
              <span class="compact-icon">👨‍👩‍👧</span>
            } @else {
              <div class="app-dot-logo"></div>
            }
          </div>

          <div class="compact-trailing">
            @if (dock.islandMode() === 'music') {
              <span class="trailing-note">♪</span>
            } @else if (dock.islandMode() === 'timer') {
              <span class="trailing-timer">03:04</span>
            } @else if (dock.islandMode() === 'family') {
              <span class="trailing-badge">Home (2)</span>
            } @else {
              <span class="trailing-status">apdock</span>
            }
          </div>
        </div>
      }

      <!-- EXPANDED DETAILED STATE -->
      @if (dock.isIslandExpanded()) {
        <div class="expanded-view" (click)="$event.stopPropagation()">
          <!-- Header with close trigger -->
          <div class="expanded-header">
            <div class="mode-badge">
              <span class="badge-dot"></span>
              <span class="badge-text">{{ getModeTitle() }}</span>
            </div>
            <button 
              type="button" 
              class="island-close-btn pressable" 
              (click)="dock.collapseIsland()"
              aria-label="Collapse island"
            >
              ✕
            </button>
          </div>

          <!-- Content by Mode -->
          @if (dock.islandMode() === 'music') {
            <div class="island-media-body">
              <div class="album-art-wrap">
                <img src="app-icon.png" alt="Apdock Artwork" class="album-art" />
              </div>
              <div class="media-meta">
                <span class="track-title">{{ dock.nowPlayingTrack().title }}</span>
                <span class="artist-name">{{ dock.nowPlayingTrack().artist }}</span>
                <div class="progress-track">
                  <div class="progress-fill"></div>
                </div>
              </div>
              <div class="media-controls">
                <button type="button" class="ctrl-btn pressable" (click)="dock.toggleMusicPlayback()">
                  {{ dock.isPlayingAudio() ? '⏸' : '▶' }}
                </button>
              </div>
            </div>
          } @else if (dock.islandMode() === 'timer') {
            <div class="island-timer-body">
              <div class="timer-digits">03:04</div>
              <span class="timer-desc">Daily Meditation & Focus Routine</span>
              <div class="timer-actions">
                <button type="button" class="island-action-pill pause pressable" (click)="haptics.trigger('pop')">Pause</button>
                <button type="button" class="island-action-pill cancel pressable" (click)="dock.collapseIsland()">End</button>
              </div>
            </div>
          } @else if (dock.islandMode() === 'family') {
            <div class="island-family-body">
              <div class="family-ping-info">
                <span class="avatar-large">👩🏻</span>
                <div class="ping-text">
                  <strong>Sophia checked in</strong>
                  <span>Arrived at Home • 4 mins ago</span>
                </div>
              </div>
              <button 
                type="button" 
                class="island-reply-btn pressable" 
                (click)="dock.collapseIsland(); haptics.trigger('success')"
              >
                👋 Send Ping
              </button>
            </div>
          } @else {
            <div class="island-health-body">
              <div class="ring-status-summary">
                <span class="ring-emoji">🔥</span>
                <div class="ring-text">
                  <strong>540 / 650 kcal burned</strong>
                  <span>83% of daily activity completed</span>
                </div>
              </div>
              <button 
                type="button" 
                class="island-reply-btn pressable" 
                (click)="dock.collapseIsland(); haptics.trigger('pop')"
              >
                View Activity
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      justify-content: center;
      position: sticky;
      top: 0;
      z-index: 100;
      width: 100%;
      pointer-events: none;
    }

    .island-container {
      pointer-events: auto;
      margin-top: max(8px, var(--sat));
      background: var(--bg-glass-island);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-shadow: 0 12px 35px -6px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.12) inset;
      backdrop-filter: blur(35px) saturate(200%);
      -webkit-backdrop-filter: blur(35px) saturate(200%);
      border-radius: 28px;
      cursor: pointer;
      overflow: hidden;
      transition: width 0.42s var(--spring-bounce), height 0.42s var(--spring-bounce), border-radius 0.42s var(--spring-bounce), padding 0.3s ease;
      will-change: width, height, border-radius;
      
      /* Default Compact Notch Pill */
      width: 132px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 10px;
    }

    .island-container.expanded {
      width: min(92vw, 360px);
      height: 154px;
      border-radius: 36px;
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      cursor: default;
    }

    /* Compact View Styles */
    .compact-view {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
    }

    .compact-leading, .compact-trailing {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .app-dot-logo {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--grad-roof);
      box-shadow: 0 0 8px var(--brand-sky);
    }

    .compact-icon {
      font-size: 13px;
    }

    .trailing-status {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.3px;
      color: var(--text-secondary);
    }

    .trailing-timer {
      font-size: 11px;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--quad-flow);
    }

    .trailing-badge {
      font-size: 10px;
      font-weight: 600;
      color: var(--quad-family);
    }

    .trailing-note {
      font-size: 12px;
      color: var(--brand-cyan);
    }

    /* Audio wave animation */
    .audio-wave-mini {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 12px;
    }

    .audio-wave-mini .bar {
      width: 2.5px;
      background: var(--brand-cyan);
      border-radius: 2px;
      animation: barJump 1s ease-in-out infinite alternate;
    }
    .bar-1 { height: 6px; animation-delay: 0.1s; }
    .bar-2 { height: 11px; animation-delay: 0.3s; }
    .bar-3 { height: 8px; animation-delay: 0.2s; }

    @keyframes barJump {
      0% { height: 3px; }
      100% { height: 12px; }
    }

    /* Expanded View Styles */
    .expanded-view {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      justify-content: space-between;
      animation: fadeIn 0.22s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .expanded-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 6px;
    }

    .mode-badge {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--brand-cyan);
      box-shadow: 0 0 6px var(--brand-cyan);
    }

    .badge-text {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--text-secondary);
    }

    .island-close-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.14);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--text-secondary);
    }

    /* Media Expanded */
    .island-media-body {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-top: 6px;
    }

    .album-art-wrap {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }

    .album-art {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .media-meta {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .track-title {
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .artist-name {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .progress-track {
      width: 100%;
      height: 3px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 99px;
      margin-top: 6px;
      overflow: hidden;
    }

    .progress-fill {
      width: 62%;
      height: 100%;
      background: var(--grad-roof);
    }

    .ctrl-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.18);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    /* Timer Expanded */
    .island-timer-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding-top: 4px;
    }

    .timer-digits {
      font-size: 26px;
      font-weight: 800;
      font-family: var(--font-mono);
      letter-spacing: 1px;
      color: var(--quad-flow);
    }

    .timer-desc {
      font-size: 11px;
      color: var(--text-secondary);
    }

    .timer-actions {
      display: flex;
      gap: 10px;
      margin-top: 6px;
    }

    .island-action-pill {
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
    }

    .island-action-pill.pause {
      background: rgba(255, 159, 10, 0.25);
      color: #ffb703;
      border: 1px solid rgba(255, 159, 10, 0.3);
    }

    .island-action-pill.cancel {
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
    }

    /* Family & Health Expanded */
    .island-family-body, .island-health-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 6px;
    }

    .family-ping-info, .ring-status-summary {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .avatar-large, .ring-emoji {
      font-size: 26px;
    }

    .ping-text, .ring-text {
      display: flex;
      flex-direction: column;
      font-size: 12px;
    }

    .ping-text span, .ring-text span {
      font-size: 10px;
      color: var(--text-secondary);
    }

    .island-reply-btn {
      padding: 8px 14px;
      background: var(--grad-roof);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      box-shadow: 0 4px 12px rgba(0, 132, 255, 0.35);
    }
  `]
})
export class DynamicIslandComponent {
  dock = inject(DockAppService);
  haptics = inject(HapticService);

  onIslandClick(event: MouseEvent): void {
    if (!this.dock.isIslandExpanded()) {
      this.dock.toggleDynamicIsland();
    }
  }

  getModeTitle(): string {
    switch (this.dock.islandMode()) {
      case 'music': return 'Now Playing';
      case 'timer': return 'Focus Session';
      case 'family': return 'Family Ping';
      case 'health': return 'Daily Activity';
      default: return 'apdock';
    }
  }
}
