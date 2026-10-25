import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HeaderComponent } from './header.component';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { DietService } from '../../core/services/diet.service';

describe('HeaderComponent', () => {
  let component: HeaderComponent;
  let fixture: ComponentFixture<HeaderComponent>;
  let authService: AuthService;
  let themeService: ThemeService;
  let dietService: DietService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [HeaderComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService);
    themeService = TestBed.inject(ThemeService);
    dietService = TestBed.inject(DietService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create HeaderComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle theme through ThemeService', () => {
    component.setTheme('dark');
    expect(themeService.currentTheme()).toBe('dark');

    component.setTheme('light');
    expect(themeService.currentTheme()).toBe('light');
  });

  it('should toggle and close the settings dropdown menu', () => {
    expect(component.isMenuOpen()).toBe(false);

    component.toggleMenu();
    expect(component.isMenuOpen()).toBe(true);

    component.closeMenu();
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should toggle and close the diet preference popover menu', () => {
    expect(component.isDietPrefMenuOpen()).toBe(false);

    component.toggleDietPrefMenu();
    expect(component.isDietPrefMenuOpen()).toBe(true);
    expect(component.isMenuOpen()).toBe(false);

    // Opening settings should close diet pref menu
    component.toggleMenu();
    expect(component.isMenuOpen()).toBe(true);
    expect(component.isDietPrefMenuOpen()).toBe(false);

    component.closeDietPrefMenu();
    expect(component.isDietPrefMenuOpen()).toBe(false);
  });

  it('should update goal and diet type through DietService', async () => {
    const saveSpy = vi.spyOn(dietService, 'savePreference').mockResolvedValue();

    await component.updateGoal('gain');
    expect(saveSpy).toHaveBeenCalledWith('gain', expect.any(String));

    await component.updateDietType('both');
    expect(saveSpy).toHaveBeenCalledWith(expect.any(String), 'both');
  });

  it('should open and close the full diet modal', () => {
    expect(component.isDietModalOpen()).toBe(false);

    component.openFullDietModal();
    expect(component.isDietModalOpen()).toBe(true);
    expect(component.isDietPrefMenuOpen()).toBe(false);

    component.closeFullDietModal();
    expect(component.isDietModalOpen()).toBe(false);
  });

  it('should show diet preference button only when isDietModule is true', () => {
    component.inDietModule = false;
    fixture.detectChanges();
    let btn = fixture.nativeElement.querySelector('#dietPrefTriggerBtn');
    expect(btn).toBeNull();

    component.inDietModule = true;
    fixture.detectChanges();
    btn = fixture.nativeElement.querySelector('#dietPrefTriggerBtn');
    expect(btn).not.toBeNull();
  });

  it('should call auth.signOut and navigate to /auth on handleSignOut', async () => {
    const signOutSpy = vi.spyOn(authService, 'signOut').mockResolvedValue();
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.isMenuOpen.set(true);
    await component.handleSignOut();

    expect(component.isMenuOpen()).toBe(false);
    expect(signOutSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should manage delete confirmation modal state', () => {
    component.openDeleteConfirmModal();
    expect(component.showDeleteConfirmModal()).toBe(true);

    component.closeDeleteConfirmModal();
    expect(component.showDeleteConfirmModal()).toBe(false);
  });

  it('should call auth.deleteAccount and navigate to /auth on confirm delete', async () => {
    const deleteSpy = vi.spyOn(authService, 'deleteAccount').mockResolvedValue();
    const navSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.openDeleteConfirmModal();
    await component.handleConfirmDeleteAccount();

    expect(deleteSpy).toHaveBeenCalled();
    expect(component.showDeleteConfirmModal()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should handle checkForUpdates and trigger reload', async () => {
    const reloadSpy = vi.spyOn(component, 'reloadWindow').mockImplementation(() => {});

    await component.checkForUpdates();

    expect(component.updateStatusMessage()).toContain('Applying latest build');
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should display error if checking for updates when offline', async () => {
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    await component.checkForUpdates();

    expect(component.isUpdateError()).toBe(true);
    expect(component.updateStatusMessage()).toContain('Device is offline');

    Object.defineProperty(navigator, 'onLine', { value: originalOnline, configurable: true });
  });
});
