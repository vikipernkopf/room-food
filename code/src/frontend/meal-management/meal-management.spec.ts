import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { MealManagement } from './meal-management';

describe('Meal', () => {
  let component: MealManagement;
  let fixture: ComponentFixture<MealManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealManagement],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
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
