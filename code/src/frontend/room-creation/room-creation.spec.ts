import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomCreation } from './room-creation';

describe('RoomCreation', () => {
  let component: RoomCreation;
  let fixture: ComponentFixture<RoomCreation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomCreation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomCreation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
