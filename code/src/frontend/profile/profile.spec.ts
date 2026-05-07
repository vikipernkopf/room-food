//noinspection VoidExpressionJS

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { Profile } from './profile';
import { AuthService } from '../core/auth-service';

@Component({
	standalone: true,
	template: ''
})
class DummyLoginComponent {
}

describe('Profile', () => {
	let component: Profile;
	let fixture: ComponentFixture<Profile>;

	beforeEach(async () => {
		const authService = {
			currentUser: signal({
				username: 'alice',
				email: 'alice@example.com',
				dob: '2000-01-01'
			}),
			getPublicProfile: vi.fn().mockReturnValue(of({
				username: 'alice',
				firstName: 'Alice',
				lastName: 'Liddell',
				bio: 'Hello',
				profilePicture: ''
			})),
			updateProfile: vi.fn().mockReturnValue(of({
				username: 'alice',
				firstName: 'A',
				lastName: 'B',
				bio: 'Updated',
				profilePicture: 'https://img'
			})),
			deleteUser: vi.fn().mockReturnValue(of(void 0))
		} as any;

		await TestBed.configureTestingModule({
			imports: [Profile],
			providers: [
				provideRouter([
					{
						path: 'login',
						component: DummyLoginComponent
					}
				]),
				{
					provide: AuthService,
					useValue: authService
				},
				{
					provide: ActivatedRoute,
					useValue: { paramMap: of(convertToParamMap({ username: 'alice' })) }
				}
			]
		}).compileComponents();

		fixture = TestBed.createComponent(Profile);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => expect(component).toBeTruthy());

	it('loads the profile and saves edits for the current user', async () => {
		const authService = TestBed.inject(AuthService) as any;
		(component as any).profile.set({
			username: 'alice',
			firstName: 'Alice',
			lastName: 'Liddell',
			bio: 'Hello',
			profilePicture: ''
		});
		expect((component as any).isOwnProfile()).toBeTruthy();

		(component as any).editForm.patchValue({
			firstName: 'Ada',
			lastName: 'Lovelace',
			bio: 'Mathematician',
			profilePicture: 'https://example.com/pfp.png',
			email: 'alice@example.com',
			dob: '2000-01-01',
			password: 'newpassword1!'
		});

		await (component as any).saveProfile();

		expect(authService.updateProfile).toHaveBeenCalledWith(
			'alice',
			expect.objectContaining({
				actorUsername: 'alice',
				firstName: 'Ada',
				lastName: 'Lovelace'
			})
		);
		expect((component as any).saveSuccess()).toContain('Profile updated successfully');
	});

	it('requires a password before deleting the profile', () => {
		(component as any).editForm.patchValue({ password: '' });

		(component as any).deleteUserBtn();

		expect((component as any).deleteError()).toContain('Please enter your password');
	});
});
