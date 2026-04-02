// noinspection GrazieInspection

import {Injectable, signal, WritableSignal} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginCredentials, PublicProfile, SignUpCredentials, UpdateProfilePayload, User } from '../../backend/model';
import { Observable, tap } from 'rxjs';

function getApiBase(): string {
  // Runtime override: window.__API_URL can be injected into the page (e.g. by a script
  // in index.html) so the deployed static site can point to any backend without rebuild.
  const win = typeof window !== 'undefined' ? (window as any) : undefined;
  const runtime = win && (win.__API_URL || win.API_URL);
  return runtime || environment.apiUrl || '/api';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
	private apiBase = getApiBase();
	constructor(private http: HttpClient, private router: Router) {}
	public readonly currentUser: WritableSignal<User | null> = signal(null);
	public readonly loginError: WritableSignal<string> = signal('');
	public readonly signUpError: WritableSignal<string> = signal('');

	login(credentials: LoginCredentials, returnUrl: string = '/homepage') {
		console.log("Logging in at endpoint:", `${this.apiBase}/login`);

		this.http.post<User>(`${this.apiBase}/login`, credentials).subscribe({
			next: (user) => {
				console.log('Login successful for:', user.username);
				this.currentUser.set(user);
				this.loginError.set('');
				// noinspection JSIgnoredPromiseFromCall
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
	deleteUser(credentials: LoginCredentials): Observable<User> {
		return this.http.delete<User>(`${this.apiBase}/delete`, { body: credentials }).pipe(
			tap((user) => {
				console.log(`User ${user.username} deleted successfully`);
				this.logout();
			})
		);
	}
	signUp(credentials: SignUpCredentials, returnUrl: string = '/homepage') {
		this.http.post<User>(`${this.apiBase}/signup`, credentials).subscribe({
			next: (user) => {
				console.log('Sign up successful for:', user);
				this.currentUser.set(user);
				this.signUpError.set('');
				// noinspection JSIgnoredPromiseFromCall
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
		this.currentUser.set(null);
		console.log("User logged out");
		this.router.navigate(['/homepage']);
	}

	getPublicProfile(username: string): Observable<PublicProfile> {
		return this.http.get<PublicProfile>(`${this.apiBase}/users/${username}`);
	}

	updateProfile(username: string, payload: UpdateProfilePayload): Observable<User> {
		return this.http.put<User>(`${this.apiBase}/users/${username}`, payload).pipe(
			tap((updatedUser) => {
				const existing = this.currentUser();
				if (existing?.username === updatedUser.username) {
					this.currentUser.set(updatedUser);
				}
			})
		);
	}
}
