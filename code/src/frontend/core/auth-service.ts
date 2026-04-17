import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginCredentials, PublicProfile, SignUpCredentials, UpdateProfilePayload, User } from '../../backend/model';
import { Observable, tap } from 'rxjs';

function getApiBase(): string {
	const win = typeof window !== 'undefined' ? (window as any) : undefined;
	const runtime = win && (win.__API_URL || win.API_URL);
	return runtime || environment.apiUrl || '/api';
}

@Injectable({
	providedIn: 'root',
})
export class AuthService {
	private apiBase = getApiBase();
	private http = inject(HttpClient);
	private router = inject(Router);

	public readonly currentUser: WritableSignal<User | null> = signal(null);
	public readonly loginError: WritableSignal<string> = signal('');
	public readonly signUpError: WritableSignal<string> = signal('');

	// Called once on app startup — reads the httpOnly cookie via /me
	restoreSession(): void {
		this.http.get<User>(`${this.apiBase}/me`, { withCredentials: true }).subscribe({
			next: (user) => this.currentUser.set(user),
			error: () => this.currentUser.set(null) // no valid session, that's fine
		});
	}

	login(credentials: LoginCredentials, returnUrl: string = '/homepage') {
		this.http.post<User>(`${this.apiBase}/login`, credentials, { withCredentials: true }).subscribe({
			next: (user) => {
				this.currentUser.set(user);
				this.loginError.set('');
				this.router.navigateByUrl(returnUrl);
			},
			error: (err) => {
				if (err.status === 401) {
					this.loginError.set('Wrong username or password');
				} else {
					this.loginError.set('Server error, try again later');
				}
			}
		});
	}

	signUp(credentials: SignUpCredentials, returnUrl: string = '/homepage') {
		this.http.post<User>(`${this.apiBase}/signup`, credentials, { withCredentials: true }).subscribe({
			next: (user) => {
				this.currentUser.set(user);
				this.signUpError.set('');
				this.router.navigateByUrl(returnUrl);
			},
			error: (err) => {
				if (err.status === 409) {
					const reason = err?.error?.reason;
					if (reason === 'email_taken') {
						this.signUpError.set('This e-mail address is already in use');
					} else if (reason === 'username_taken') {
						this.signUpError.set('This username is already in use');
					} else {
						this.signUpError.set('Username or e-mail already exists');
					}
				} else {
					this.signUpError.set('Server error, try again later');
				}
			}
		});
	}

	logout() {
		this.http.post(`${this.apiBase}/logout`, {}, { withCredentials: true }).subscribe({
			next: () => {
				this.currentUser.set(null);
				this.router.navigate(['/homepage']);
			},
			error: () => {
				// Clear local state even if the request fails
				this.currentUser.set(null);
				this.router.navigate(['/homepage']);
			}
		});
	}

	deleteUser(credentials: LoginCredentials): Observable<void> {  // Backend returns 200, no body
		return this.http.delete<void>(`${this.apiBase}/delete`, {
			body: { identifier: credentials.identifier },  // Send only what's needed
			withCredentials: true
		}).pipe(
			tap(() => {
				console.log(`User ${credentials.identifier} deleted successfully`);
				this.logout();
			})
		);
	}

	getPublicProfile(username: string): Observable<PublicProfile> {
		return this.http.get<PublicProfile>(`${this.apiBase}/users/${username}`, { withCredentials: true });
	}

	updateProfile(username: string, payload: UpdateProfilePayload): Observable<User> {
		return this.http.put<User>(`${this.apiBase}/users/${username}`, payload, { withCredentials: true }).pipe(
			tap((updatedUser) => {
				const existing = this.currentUser();
				if (existing?.username === updatedUser.username) {
					this.currentUser.set(updatedUser);
				}
			})
		);
	}
}
