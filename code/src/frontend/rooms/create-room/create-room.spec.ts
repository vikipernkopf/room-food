import { signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { RoomCreation } from './create-room';
import { AuthService } from '../../core/auth-service';
import { RoomService } from '../../core/room-service';

class StubAuthService {
	public readonly currentUser: WritableSignal<any | null> = signal({ username: 'alice' });
}

describe('RoomCreation', () => {
	let component: RoomCreation;

	beforeEach(async () => {
		const authService = new StubAuthService();
		const roomService = {
			saveError: signal(''),
			createRoom: vi.fn().mockReturnValue(of({ result: 'R123' }))
		} as any;

		await TestBed.configureTestingModule({
			imports: [RoomCreation],
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
		.compileComponents();

		let fixture: ComponentFixture<RoomCreation> = TestBed.createComponent(RoomCreation);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('creates a room and navigates to its calendar', () => {
		const roomService = TestBed.inject(RoomService) as any;
		const router = TestBed.inject(Router) as any;
		vi.spyOn(router, 'navigate').mockResolvedValue(true as any);

		component.roomCreationForm.setValue({
			roomName: 'Apartment',
			roomPictureUrl: ''
		});
		component.onFormSubmit();

		expect(roomService.createRoom).toHaveBeenCalledWith('alice', 'Apartment', expect.any(String));
		expect(router.navigate).toHaveBeenCalledWith(['/calendar/R123']);
	});

	it('marks the form touched when invalid', () => {
		component.roomCreationForm.setValue({
			roomName: '',
			roomPictureUrl: ''
		});
		component.onFormSubmit();

		expect(component.roomCreationForm.get('roomName')?.touched).toBeTruthy();
	});
});
