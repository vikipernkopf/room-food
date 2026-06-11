import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter } from '@angular/router';
import { User } from '../../../backend/model';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../../core/auth-service';
import { RoomService } from '../../core/room-service';

import { JoinRoom } from './join-room';

describe('JoinRoom', () => {
	let component: JoinRoom;
	let fixture: ComponentFixture<JoinRoom>;
	const currentUser = signal<User | null>({ username: 'Lari' });
	let requestToJoinRoom = vi.fn();
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
		// Component error-paths intentionally log to console; mute in test output.
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		currentUser.set({ username: 'Lari' });
		requestToJoinRoom = vi.fn();

		await TestBed.configureTestingModule({
			imports: [JoinRoom],
			providers: [
				{
					provide: AuthService,
					useValue: { currentUser }
				},
				{
					provide: RoomService,
					useValue: { requestToJoinRoom }
				},
				provideRouter([]),
				provideLocationMocks()
			]
		}).compileComponents();

		fixture = TestBed.createComponent(JoinRoom);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('should keep status area rendered even when there is no message', () => {
		const statusEl = fixture.nativeElement.querySelector('.status-msg span');
		expect(statusEl).not.toBeNull();
		expect(statusEl.textContent.trim()).toBe('');
	});

	it('should show a success message after a successful join request', () => {
		requestToJoinRoom.mockReturnValue(of({ result: true }));

		component.roomJoinForm.setValue({ roomCode: ' rdvpgj ' });
		component.onFormSubmit();
		fixture.detectChanges();

		expect(requestToJoinRoom).toHaveBeenCalledWith('Lari', 'RDVPGJ');
		// The template applies success/error classes on the .status-msg element as
		// .success-text / .error-text — assert those classes instead of the
		// older '.status-msg--success' naming.
		expect(fixture.nativeElement.querySelector('.status-msg.success-text')).not.toBeNull();
		expect(fixture.nativeElement.querySelector('.status-msg.error-text')).toBeNull();
		expect(fixture.nativeElement.textContent).toContain('Join request sent successfully.');
	});

	it('should show an error message when the join request fails', () => {
		requestToJoinRoom.mockReturnValue(throwError(() => ({ status: 400 })));

		component.roomJoinForm.setValue({ roomCode: 'RDVPGJ' });
		component.onFormSubmit();
		fixture.detectChanges();

		expect(requestToJoinRoom).toHaveBeenCalledWith('Lari', 'RDVPGJ');
		expect(fixture.nativeElement.querySelector('.status-msg.error-text')).not.toBeNull();
		expect(fixture.nativeElement.textContent).toContain('Invalid room code. Please check and try again.');
	});
});
