import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MoveRecipeModalComponent } from './move-recipe-modal.component';
import { AdditionalRecipe } from '../../core/services/diet.service';

describe('MoveRecipeModalComponent', () => {
  let component: MoveRecipeModalComponent;
  let fixture: ComponentFixture<MoveRecipeModalComponent>;

  const mockRecipe: AdditionalRecipe = {
    id: 'mock-ar-1',
    title: 'Protein Avocado Tofu Toast',
    category: 'High Protein',
    calories: 290,
    protein: 16,
    prepTime: '8 mins',
    dietType: 'veg',
    imageIcon: '🥑',
    description: 'Crisp sourdough spread with ripe avocado and grilled tofu.',
    keyIngredients: ['Sourdough', 'Ripe Avocado', 'Firm Tofu'],
    instructions: ['Toast and assemble']
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoveRecipeModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MoveRecipeModalComponent);
    component = fixture.componentInstance;
    component.recipe = mockRecipe;
    component.activeDay = 'Tuesday';
    component.activeSlot = 'lunch';
    fixture.detectChanges();
  });

  it('should create MoveRecipeModalComponent', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize selectedSlot with activeSlot input', () => {
    expect(component.selectedSlot()).toBe('lunch');
  });

  it('should allow changing the selected slot to breakfast or dinner', () => {
    component.setSlot('breakfast');
    expect(component.selectedSlot()).toBe('breakfast');

    component.setSlot('dinner');
    expect(component.selectedSlot()).toBe('dinner');
  });

  it('should emit moved event with selected meal slot for active day on confirmMove', () => {
    const movedSpy = vi.spyOn(component.moved, 'emit');
    component.setSlot('breakfast');

    component.confirmMove();

    expect(movedSpy).toHaveBeenCalledWith({
      recipe: mockRecipe,
      slotId: 'breakfast',
      applyToAllDays: false
    });
  });

  it('should emit close event on closeModal and unlock body scroll', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    component.closeModal();

    expect(closeSpy).toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
  });

  it('should close when onEscapeKey is pressed', () => {
    const closeSpy = vi.spyOn(component.close, 'emit');
    component.onEscapeKey();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('should emit edit event when clicking the footer edit link', () => {
    const editSpy = vi.spyOn(component.edit, 'emit');
    const footerBtn: HTMLButtonElement = fixture.nativeElement.querySelector('#btnFooterEditRecipe');
    expect(footerBtn).toBeTruthy();
    footerBtn.click();

    expect(editSpy).toHaveBeenCalledWith(mockRecipe);
  });
});
