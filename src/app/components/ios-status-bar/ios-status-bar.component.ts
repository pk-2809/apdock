import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ios-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="ios-status-bar" role="banner" aria-label="iOS Status Bar">
      <!-- Left: Clock -->
      <div class="time-display">
        <time>{{ currentTime() }}</time>
      </div>

      <!-- Center notch allowance (Dynamic Island sits here) -->
      <div class="island-notch-spacer"></div>

      <!-- Right: Cellular, Wi-Fi, Battery -->
      <div class="telemetry-icons">
        <!-- Cellular Signal (4 bars) -->
        <div class="cellular-bars" aria-label="Cellular signal full">
          <span class="bar bar-1 active"></span>
          <span class="bar bar-2 active"></span>
          <span class="bar bar-3 active"></span>
          <span class="bar bar-4 active"></span>
        </div>

        <!-- 5G / Wi-Fi glyph -->
        <div class="network-badge">5G</div>

        <svg class="wifi-glyph" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Wi-Fi connected">
          <path d="M12 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" fill="currentColor"/>
          <path d="M8.2 13.5a5.5 5.5 0 017.6 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M4.9 10.2a10.2 10.2 0 0114.2 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>

        <!-- Battery Container with Level -->
        <div class="battery-capsule" aria-label="Battery 98%">
          <div class="battery-body">
            <div class="battery-level" [style.width.%]="batteryLevel()"></div>
          </div>
          <div class="battery-nub"></div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      user-select: none;
    }

    .ios-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 44px;
      padding: 0 20px;
      padding-top: max(4px, var(--sat));
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      position: relative;
      z-index: 90;
    }

    .time-display time {
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -0.2px;
    }

    .island-notch-spacer {
      flex: 1;
      height: 100%;
    }

    .telemetry-icons {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .cellular-bars {
      display: flex;
      align-items: flex-end;
      gap: 1.5px;
      height: 10.5px;
    }

    .cellular-bars .bar {
      width: 3px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 1px;
    }
    .cellular-bars .bar.active {
      background: #fff;
    }
    .cellular-bars .bar-1 { height: 3px; }
    .cellular-bars .bar-2 { height: 5.5px; }
    .cellular-bars .bar-3 { height: 8px; }
    .cellular-bars .bar-4 { height: 10.5px; }

    .network-badge {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: -0.2px;
      margin-right: 1px;
    }

    .wifi-glyph {
      width: 15px;
      height: 15px;
      color: #fff;
    }

    .battery-capsule {
      display: flex;
      align-items: center;
      gap: 1.5px;
    }

    .battery-body {
      width: 22px;
      height: 11.5px;
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      border-radius: 3.5px;
      padding: 1px;
      display: flex;
      align-items: center;
    }

    .battery-level {
      height: 100%;
      background: #fff;
      border-radius: 1.5px;
      transition: width 0.3s ease;
    }

    .battery-nub {
      width: 1.5px;
      height: 4.5px;
      background: rgba(255, 255, 255, 0.6);
      border-radius: 0 1px 1px 0;
    }
  `]
})
export class IosStatusBarComponent implements OnInit, OnDestroy {
  readonly currentTime = signal<string>('9:41');
  readonly batteryLevel = signal<number>(98);
  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.updateClock();
    this.timer = setInterval(() => this.updateClock(), 15000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private updateClock(): void {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    hours = hours % 12 || 12;
    this.currentTime.set(`${hours}:${minutes}`);
  }
}
