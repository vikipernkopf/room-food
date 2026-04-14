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
});
