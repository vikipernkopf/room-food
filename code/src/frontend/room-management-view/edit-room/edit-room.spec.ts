import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { EditRoom } from './edit-room';
import { AuthService } from '../../core/auth-service';
import { RoomService } from '../../core/room-service';

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal({ username: 'alice' });
}

describe('EditRoom', () => {
	let component: EditRoom;

	beforeEach(async () => {
		const authService = new StubAuthService();
		const roomService = {
			checkRoomExists: vi.fn().mockReturnValue(of({ exists: true })),
			getRoomName: vi.fn().mockReturnValue(of({ roomName: 'Apartment' })),
			getMembersPerRoom: vi.fn().mockReturnValue(of([
				{
					username: 'alice',
					role: 'owner'
				}
			])),
			editRoom: vi.fn().mockReturnValue(of({ success: true }))
		} as any;
		const router = { navigate: vi.fn() } as any;

		await TestBed.configureTestingModule({
			imports: [EditRoom],
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
					provide: Router,
					useValue: router
				},
				{
					provide: ActivatedRoute,
					useValue: {
						paramMap: of(convertToParamMap({ code: 'A1' })),
						snapshot: { paramMap: convertToParamMap({ code: 'A1' }) }
					}
				}
			]
		}).compileComponents();

		let fixture: ComponentFixture<EditRoom> = TestBed.createComponent(EditRoom);
		component = fixture.componentInstance;
		fixture.detectChanges();
		await fixture.whenStable();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('saves the room and closes with success', async () => {
		const roomService = TestBed.inject(RoomService) as any;
		const closeSpy = vi.spyOn((component as any).close, 'emit');

		(component as any).editForm.patchValue({
			roomName: 'New Name',
			pfp: 'https://img'
		});
		await component.onSubmit();

		expect(roomService.editRoom).toHaveBeenCalledWith('A1', 'alice', 'New Name', 'https://img');
		expect(closeSpy).toHaveBeenCalledWith(true);
	});

	it('emits false on cancel', () => {
		const closeSpy = vi.spyOn((component as any).close, 'emit');

		component.onCancel();

		expect(closeSpy).toHaveBeenCalledWith(false);
	});
});
