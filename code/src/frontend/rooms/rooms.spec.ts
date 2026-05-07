import { Component, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { RouterLink, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Rooms } from './rooms';
import { AuthService } from '../core/auth-service';
import { RoomService } from '../core/room-service';

@Component({
	selector: 'app-room-creation',
	standalone: true,
	template: ''
})
class StubRoomCreation {
}

@Component({
	selector: 'app-join-room',
	standalone: true,
	template: ''
})
class StubJoinRoom {
}

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal({ username: 'alice' });
}

describe('Rooms', () => {
	let component: Rooms;

	beforeEach(async () => {
		const authService = new StubAuthService();
		const roomService = {
			getRoomsForMember: vi.fn().mockReturnValue(of([
				{
					code: 'A1',
					roomName: 'Apartment',
					role: 'owner'
				}
			])),
			createRoom: vi.fn().mockReturnValue(of({ result: 'X1' }))
		} as any;

		await TestBed.configureTestingModule({
			imports: [Rooms],
			providers: [
				provideRouter([]),
				provideLocationMocks(),
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
		.overrideComponent(Rooms, {
			set: { imports: [RouterLink, StubRoomCreation, StubJoinRoom] }
		})
		.compileComponents();

		let fixture: ComponentFixture<Rooms> = TestBed.createComponent(Rooms);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('opens and closes the create/join popups', () => {
		(component as any).openCreateRoom();
		expect((component as any).activePopup).toBe('create');

		(component as any).openJoinRoom();
		expect((component as any).activePopup).toBe('join');

		(component as any).closePopup();
		expect((component as any).activePopup).toBeNull();
	});

	it('creates a room and stores the resulting code', () => {
		const roomService = TestBed.inject(RoomService) as any;
		(component as any).roomNameControl.setValue('Kitchen');

		(component as any).newRoom();

		expect(roomService.createRoom).toHaveBeenCalledWith('alice', 'Kitchen');
		expect((component as any).createdRoomCode).toBe('X1');
		expect((component as any).activePopup).toBeNull();
	});
});
