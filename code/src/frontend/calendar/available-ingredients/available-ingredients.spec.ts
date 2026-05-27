import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvailableIngredients } from './available-ingredients';

describe('AvailableIngredients', () => {
  let component: AvailableIngredients;
  let fixture: ComponentFixture<AvailableIngredients>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvailableIngredients]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvailableIngredients);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
