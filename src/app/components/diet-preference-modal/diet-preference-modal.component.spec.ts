import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DietPreferenceModalComponent } from './diet-preference-modal.component';
import { DietService } from '../../core/services/diet.service';

describe('DietPreferenceModalComponent', () => {
  let component: DietPreferenceModalComponent;
  let fixture: ComponentFixture<DietPreferenceModalComponent>;
  let dietService: DietService;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [DietPreferenceModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DietPreferenceModalComponent);
    component = fixture.componentInstance;
    dietService = TestBed.inject(DietService);
    fixture.detectChanges();
  });

  it('should create DietPreferenceModalComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should allow toggling goal between loss and gain', () => {
    expect(component.selectedGoal()).toBe('loss');
    component.setGoal('gain');
    expect(component.selectedGoal()).toBe('gain');
    component.setGoal('loss');
    expect(component.selectedGoal()).toBe('loss');
  });

  it('should allow multi-selecting both veg and nonveg', () => {
    component.setDietType('veg');
    expect(component.isVegSelected()).toBe(true);
    expect(component.isNonVegSelected()).toBe(false);

    // Tapping nonveg when veg is active enables BOTH
    component.toggleNonVeg();
    expect(component.selectedDietType()).toBe('both');
    expect(component.isVegSelected()).toBe(true);
    expect(component.isNonVegSelected()).toBe(true);
    expect(component.isBothSelected()).toBe(true);

    // Tapping veg when both are active unchecks veg, leaving nonveg
    component.toggleVeg();
    expect(component.selectedDietType()).toBe('nonveg');
    expect(component.isVegSelected()).toBe(false);
    expect(component.isNonVegSelected()).toBe(true);
  });

  it('should allow directly selecting both via selectBoth', () => {
    component.setDietType('veg');
    component.selectBoth();
    expect(component.selectedDietType()).toBe('both');
    expect(component.isBothSelected()).toBe(true);
  });

  it('should emit close on onDismiss', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    component.onDismiss();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should save preference and emit saved + close on onConfirm with both selected', async () => {
    const saveSpy = vi.spyOn(dietService, 'savePreference').mockResolvedValue();
    const savedEmitSpy = vi.spyOn(component.saved, 'emit');
    const closeEmitSpy = vi.spyOn(component.close, 'emit');

    component.setGoal('loss');
    component.selectBoth();

    await component.onConfirm();

    expect(saveSpy).toHaveBeenCalledWith('loss', 'both');
    expect(savedEmitSpy).toHaveBeenCalledWith({ goal: 'loss', dietType: 'both' });
    expect(closeEmitSpy).toHaveBeenCalled();
  });
});
