import {Injectable, signal, WritableSignal} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
	constructor(private http: HttpClient, private router: Router) {}
	private currentUser: any = null;
	public readonly loginError: WritableSignal<string> = signal('');
	public signUpError: WritableSignal<string> = signal('');

	login(credentials: any) {
		this.http.post('/api/login', credentials).subscribe({
			next: (user) => {
				this.currentUser = user;
				console.log('Login successful for:', user);
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

	signUp(credentials: any) {
		this.http.post('/api/signup', credentials).subscribe({
			next: (user) => {
				this.currentUser = user;
				console.log('Sign up successful for:', user);
				this.router.navigate(['/homepage']);
			},
			error: (err) => {
				if (err.status === 409) {
					this.loginError.set('User exists already');
				} else {
					this.loginError.set('Server error, try again later');
				}
			}
		});
	}

	getCurrentUser() {
		return this.currentUser;
	}
}
