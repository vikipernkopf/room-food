import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecipeManagement } from './recipe-management';

describe('RecipeManagement', () => {
  let component: RecipeManagement;
  let fixture: ComponentFixture<RecipeManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecipeManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('defaults new recipes to private visibility', () => {
    expect(component.recipeVisibilityControl.value).toBe('private');
  });

  it('emits visibility when saving a recipe', () => {
    let emitted: any = null;
    component.saved.subscribe(value => {
      emitted = value;
    });

    component.recipeNameControl.setValue('Soup');
    component.recipeVisibilityControl.setValue('public');
    component.saveRecipe();

    expect(emitted?.visibility).toBe('public');
  });
});
