import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvaliableIngredients } from './avaliable-ingredients';

describe('AvaliableIngredients', () => {
  let component: AvaliableIngredients;
  let fixture: ComponentFixture<AvaliableIngredients>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AvaliableIngredients]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AvaliableIngredients);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
