import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageRecipe } from './manage-recipe';

describe('CreateRecipe', () => {
  let component: ManageRecipe;
  let fixture: ComponentFixture<ManageRecipe>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageRecipe]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageRecipe);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
