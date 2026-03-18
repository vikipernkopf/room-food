// noinspection GrazieInspection

import {Injectable, signal, WritableSignal} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { LoginCredentials, SignUpCredentials, User } from '../../backend/model';

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

	login(credentials: LoginCredentials) {
		console.log("Logging in at endpoint:", `${this.apiBase}/login`);

		this.http.post<User>(`${this.apiBase}/login`, credentials).subscribe({
			next: (user) => {
				console.log('Login successful for:', user.username);
				this.currentUser.set(user);
				this.loginError.set('');
				// noinspection JSIgnoredPromiseFromCall
				this.router.navigate(['/homepage']);
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

	signUp(credentials: SignUpCredentials) {
		this.http.post<User>(`${this.apiBase}/signup`, credentials).subscribe({
			next: (user) => {
				console.log('Sign up successful for:', user);
				this.currentUser.set(user);
				this.signUpError.set('');
				// noinspection JSIgnoredPromiseFromCall
				this.router.navigate(['/homepage']);
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
}
