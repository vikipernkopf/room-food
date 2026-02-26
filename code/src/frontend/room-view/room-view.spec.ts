import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomView } from './room-view';

describe('RoomView', () => {
  let component: RoomView;
  let fixture: ComponentFixture<RoomView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
