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

  it('should stage goal and diet type on selection and sync to DietService only on menu close', async () => {
    const saveSpy = vi.spyOn(dietService, 'savePreference').mockResolvedValue();

    component.toggleDietPrefMenu();
    expect(component.isDietPrefMenuOpen()).toBe(true);

    // Clicking options should update staged signals but NOT call savePreference
    component.updateGoal('gain');
    expect(component.stagedGoal()).toBe('gain');
    expect(saveSpy).not.toHaveBeenCalled();

    component.updateDietType('both');
    expect(component.stagedDietType()).toBe('both');
    expect(saveSpy).not.toHaveBeenCalled();

    // On menu close, it should sync the staged preferences
    await component.closeDietPrefMenu();
    expect(component.isDietPrefMenuOpen()).toBe(false);
    expect(saveSpy).toHaveBeenCalledWith('gain', 'both');
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

  it('should show "Diet Plan" as brand name when in diet module and "apdock" when not', () => {
    component.inDietModule = false;
    fixture.detectChanges();
    let brandName = fixture.nativeElement.querySelector('.brand-name');
    expect(brandName?.textContent?.trim()).toBe('apdock');

    component.inDietModule = true;
    fixture.detectChanges();
    brandName = fixture.nativeElement.querySelector('.brand-name');
    expect(brandName?.textContent?.trim()).toBe('Diet Plan');
  });

  it('should navigate to /home when navigateHome is called', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.navigateHome();
    expect(navSpy).toHaveBeenCalledWith(['/home']);
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
    component.deletePin = '849201';
    await component.handleConfirmDeleteAccount();

    expect(deleteSpy).toHaveBeenCalledWith('849201');
    expect(component.showDeleteConfirmModal()).toBe(false);
    expect(navSpy).toHaveBeenCalledWith(['/auth']);
  });

  it('should handle checkForUpdates delegating to pwaUpdate service', async () => {
    const pwaUpdate = (component as any).pwaUpdate;
    vi.spyOn(pwaUpdate, 'checkForUpdate').mockResolvedValue('up-to-date');

    await component.checkForUpdates();

    expect(component.updateStatusMessage()).toBe("You're up to date");
    expect(component.isUpdateError()).toBe(false);
  });

  it('should report offline status when pwaUpdate reports offline', async () => {
    const pwaUpdate = (component as any).pwaUpdate;
    vi.spyOn(pwaUpdate, 'checkForUpdate').mockResolvedValue('offline');

    await component.checkForUpdates();

    expect(component.isUpdateError()).toBe(true);
    expect(component.updateStatusMessage()).toBe("You're offline");
  });
});
