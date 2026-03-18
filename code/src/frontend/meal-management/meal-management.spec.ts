import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealManagement } from './meal-management';

describe('Meal', () => {
  let component: MealManagement;
  let fixture: ComponentFixture<MealManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
