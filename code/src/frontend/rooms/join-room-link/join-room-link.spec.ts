import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoinRoomLink } from './join-room-link';

describe('JoinRoomLink', () => {
  let component: JoinRoomLink;
  let fixture: ComponentFixture<JoinRoomLink>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinRoomLink]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinRoomLink);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
