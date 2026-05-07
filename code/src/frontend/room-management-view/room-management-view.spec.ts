import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { RoomManagementView } from './room-management-view';
import { AuthService } from '../core/auth-service';
import { RoomService } from '../core/room-service';
import { Role } from '../../backend/model';

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal({ username: 'alice' });
}

describe('RoomManagementView', () => {
	let component: RoomManagementView;

	beforeEach(async () => {
		const authService = new StubAuthService();
		const roomService = {
			checkRoomExists: vi.fn().mockReturnValue(of({ exists: true })),
			getRoomName: vi.fn().mockReturnValue(of({ roomName: 'Apartment' })),
			getMembersPerRoom: vi.fn().mockReturnValue(of([
				{
					username: 'alice',
					role: Role.Owner
				}
			])),
			getRequestsPerRoom: vi.fn().mockReturnValue(of([{ username: 'bob' }])),
			getRoomsForMember: vi.fn().mockReturnValue(of([
				{
					code: 'A1',
					roomName: 'Apartment',
					role: 'owner',
					profilePicture: ''
				}
			])),
			acceptRequest: vi.fn().mockReturnValue(of({ success: true })),
			rejectRequest: vi.fn().mockReturnValue(of({ success: true })),
			removeMember: vi.fn().mockReturnValue(of({ success: true })),
			deleteRoom: vi.fn().mockReturnValue(of({ success: true })),
			leaveRoom: vi.fn().mockReturnValue(of({ success: true })),
			updateMemberRole: vi.fn().mockReturnValue(of({ success: true }))
		} as any;

		await TestBed.configureTestingModule({
			imports: [RoomManagementView],
			providers: [
				provideRouter([]),
				{
					provide: AuthService,
					useValue: authService
				},
				{
					provide: RoomService,
					useValue: roomService
				},
				{
					provide: ActivatedRoute,
					useValue: { paramMap: of(convertToParamMap({ code: 'A1' })) }
				}
			]
		})
		.compileComponents();

		let fixture: ComponentFixture<RoomManagementView> = TestBed.createComponent(RoomManagementView);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('opens the edit popup and refreshes data after a successful close', () => {
		const roomService = TestBed.inject(RoomService) as any;
		(component as any).userRole.set(Role.Owner);

		component.editRoom();
		expect(component.isPopupVisible()).toBeTruthy();

		component.closePopup(true);

		expect(component.isPopupVisible()).toBeFalsy();
		expect(roomService.getRoomName).toHaveBeenCalledWith('A1');
		expect(roomService.getMembersPerRoom).toHaveBeenCalledWith('A1');
	});

	it('accepts and rejects requests through the room service', () => {
		const roomService = TestBed.inject(RoomService) as any;

		(component as any).requests.set([{ username: 'bob' }, { username: 'carol' }]);
		component.acceptRequest('bob');
		component.rejectRequest('carol');

		expect(roomService.acceptRequest).toHaveBeenCalledWith('A1', 'bob');
		expect(roomService.rejectRequest).toHaveBeenCalledWith('A1', 'carol');
	});
});
