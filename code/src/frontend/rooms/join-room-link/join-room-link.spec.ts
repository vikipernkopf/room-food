import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { JoinRoomLink } from './join-room-link';
import { AuthService } from '../../core/auth-service';
import { RoomService } from '../../core/room-service';

describe('JoinRoomLink', () => {
  let component: JoinRoomLink;
  let fixture: ComponentFixture<JoinRoomLink>;

  beforeEach(async () => {
    const authService = {
      currentUser: signal(null)
    } as any;

    const roomService = {
      requestToJoinRoom: vi.fn().mockReturnValue(of({}))
    } as any;

    await TestBed.configureTestingModule({
      imports: [JoinRoomLink],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ code: 'TEST123' }) } }
        },
        {
          provide: AuthService,
          useValue: authService
        },
        {
          provide: RoomService,
          useValue: roomService
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JoinRoomLink);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});


