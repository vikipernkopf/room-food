import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IngredientList } from './ingredient-list';

describe('IngredientList', () => {
  let component: IngredientList;
  let fixture: ComponentFixture<IngredientList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IngredientList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IngredientList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
