import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShoppingModal } from './shopping-modal';

describe('ShoppingModal', () => {
  let component: ShoppingModal;
  let fixture: ComponentFixture<ShoppingModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShoppingModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShoppingModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
