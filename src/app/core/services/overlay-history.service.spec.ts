import { TestBed } from '@angular/core/testing';
import { OverlayHistoryService } from './overlay-history.service';

describe('OverlayHistoryService', () => {
  let service: OverlayHistoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OverlayHistoryService]
    });
    service = TestBed.inject(OverlayHistoryService);
  });

  afterEach(() => {
    // Clear any residual history state
    if (window.history.state?.apdockOverlay) {
      const clean = { ...window.history.state };
      delete clean.apdockOverlay;
      window.history.replaceState(clean, '');
    }
  });

  it('should be created and start with empty overlay stack', () => {
    expect(service).toBeTruthy();
    expect(service.hasActiveOverlay()).toBe(false);
  });

  describe('Single Overlay Lifecycle', () => {
    it('pushes overlay to history state and executes closeFn on popstate (back button)', () => {
      let closed = false;
      const closeFn = () => { closed = true; };

      service.pushOverlay('test-sheet', closeFn);

      expect(service.hasActiveOverlay()).toBe(true);
      expect(window.history.state?.apdockOverlay).toBe('test-sheet');

      // Simulate hardware back button / browser back
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(closed).toBe(true);
      expect(service.hasActiveOverlay()).toBe(false);
    });

    it('removes overlay without double-popping when popOverlay is called programmatically', () => {
      let closed = false;
      const closeFn = () => { closed = true; };
      const backSpy = vi.spyOn(window.history, 'back');

      service.pushOverlay('programmatic-modal', closeFn);
      expect(service.hasActiveOverlay()).toBe(true);

      service.popOverlay('programmatic-modal');

      expect(service.hasActiveOverlay()).toBe(false);
      expect(backSpy).toHaveBeenCalled();
    });
  });

  describe('Nested Overlays Lifecycle', () => {
    it('handles nested overlays LIFO: first back closes top overlay, second back closes root overlay', () => {
      let rootClosed = false;
      let nestedClosed = false;

      const closeRoot = () => { rootClosed = true; };
      const closeNested = () => { nestedClosed = true; };

      // Open Root Sheet (e.g., Diet Move Sheet)
      service.pushOverlay('root-sheet', closeRoot);
      expect(service.hasActiveOverlay()).toBe(true);

      // Open Nested Modal (e.g., Day Picker inside Sheet)
      service.pushOverlay('nested-modal', closeNested);
      expect(service.hasActiveOverlay()).toBe(true);
      expect(window.history.state?.apdockOverlay).toBe('nested-modal');

      // First Back: Must close the nested modal ONLY
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(nestedClosed).toBe(true);
      expect(rootClosed).toBe(false);
      expect(service.hasActiveOverlay()).toBe(true);

      // Second Back: Must close the root sheet
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(rootClosed).toBe(true);
      expect(service.hasActiveOverlay()).toBe(false);
    });
  });

  describe('Escape Key Handling', () => {
    it('closes topmost overlay when Escape key is pressed', () => {
      let closed = false;
      const closeFn = () => { closed = true; };

      service.pushOverlay('escape-modal', closeFn);
      expect(service.hasActiveOverlay()).toBe(true);

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(closed).toBe(true);
      expect(service.hasActiveOverlay()).toBe(false);
    });
  });

  describe('Refresh & Initial State Hygiene', () => {
    it('cleans stale apdockOverlay from history.state on boot when refreshed with overlay open', () => {
      // Simulate state left over from a previous page session that refreshed
      window.history.replaceState({ apdockOverlay: 'stale-modal', previousKey: 'value' }, '');

      // Create a new instance within injection context
      const newService = TestBed.runInInjectionContext(() => new OverlayHistoryService());

      expect(newService.hasActiveOverlay()).toBe(false);
      expect(window.history.state?.apdockOverlay).toBeUndefined();
      expect(window.history.state?.previousKey).toBe('value');
    });

    it('does nothing when popstate fires while stack is empty (back button on /home)', () => {
      expect(service.hasActiveOverlay()).toBe(false);

      // Back button tapped on /home with no overlays open
      expect(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      }).not.toThrow();

      expect(service.hasActiveOverlay()).toBe(false);
    });
  });
});
