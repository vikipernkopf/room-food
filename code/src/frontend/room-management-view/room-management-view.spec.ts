import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoomManagementView } from './room-management-view';

describe('RoomManagementView', () => {
  let component: RoomManagementView;
  let fixture: ComponentFixture<RoomManagementView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomManagementView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomManagementView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
