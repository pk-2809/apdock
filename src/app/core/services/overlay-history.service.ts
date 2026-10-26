import { Injectable, NgZone, inject } from '@angular/core';

export interface OverlayEntry {
  id: string;
  closeFn: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class OverlayHistoryService {
  private readonly ngZone = inject(NgZone, { optional: true });
  private readonly stack: OverlayEntry[] = [];
  private isPopping = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Clean up stale overlay state if refreshed while an overlay was active
      if (window.history.state?.apdockOverlay) {
        const cleanState = { ...window.history.state };
        delete cleanState.apdockOverlay;
        window.history.replaceState(cleanState, '');
      }

      window.addEventListener('popstate', () => {
        if (this.isPopping) {
          this.isPopping = false;
          return;
        }

        if (this.stack.length > 0) {
          const top = this.stack.pop();
          if (top) {
            const close = () => {
              try {
                top.closeFn();
              } catch (err) {
                console.error('Error closing overlay on popstate:', err);
              }
            };
            if (this.ngZone) {
              this.ngZone.run(close);
            } else {
              close();
            }
          }
        }
      });

      window.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.stack.length > 0) {
          const top = this.stack.pop();
          if (top) {
            this.isPopping = true;
            if (window.history.state?.apdockOverlay === top.id) {
              window.history.back();
            }
            const close = () => {
              try {
                top.closeFn();
              } catch (err) {
                console.error('Error closing overlay on Escape:', err);
              }
            };
            if (this.ngZone) {
              this.ngZone.run(close);
            } else {
              close();
            }
          }
        }
      });
    }
  }

  /**
   * Pushes a history state when an overlay/modal/sheet/popover opens.
   */
  pushOverlay(id: string, closeFn: () => void): void {
    if (typeof window === 'undefined') return;
    // Prevent duplicate entries for same overlay id
    const existingIdx = this.stack.findIndex((item) => item.id === id);
    if (existingIdx !== -1) {
      this.stack.splice(existingIdx, 1);
    }

    this.stack.push({ id, closeFn });
    window.history.pushState({ apdockOverlay: id }, '');
  }

  /**
   * Called when an overlay is closed programmatically or by UI interaction (e.g. tap backdrop, close button).
   * Synchronously pops the history state so the user does not have to press back twice.
   */
  popOverlay(id: string): void {
    if (typeof window === 'undefined') return;
    const idx = this.stack.findIndex((item) => item.id === id);
    if (idx !== -1) {
      this.stack.splice(idx, 1);
      if (window.history.state?.apdockOverlay === id) {
        this.isPopping = true;
        window.history.back();
      }
    }
  }

  /**
   * Returns whether any overlay is currently registered on the stack.
   */
  hasActiveOverlay(): boolean {
    return this.stack.length > 0;
  }
}
