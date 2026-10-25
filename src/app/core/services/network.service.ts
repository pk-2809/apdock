import { Injectable, signal, inject, DestroyRef } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NetworkService {
  private readonly destroyRef = inject(DestroyRef);

  readonly isOnline = signal<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  constructor() {
    this.initListeners();
  }

  private initListeners(): void {
    if (typeof window === 'undefined') return;

    const onlineHandler = (): void => {
      this.isOnline.set(true);
    };

    const offlineHandler = (): void => {
      this.isOnline.set(false);
    };

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    this.destroyRef.onDestroy(() => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    });
  }
}
