import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchIngredient } from './search-ingredient';

describe('SearchIngredient', () => {
  let component: SearchIngredient;
  let fixture: ComponentFixture<SearchIngredient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchIngredient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchIngredient);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
