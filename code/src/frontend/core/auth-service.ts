import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


@Injectable({
  providedIn: 'root',
})
export class AuthService {
	constructor(private http: HttpClient, private router: Router) {}
	private currentUser: any = null;
	login(credentials: any) {
		this.http.post('/api/login', credentials).subscribe({
			next: (user) => {
				this.currentUser = user;
				console.log('Login successful for:', user);
				this.router.navigate(['/homepage']);
			},
			error: (err) => {
				if (err.status === 401) {
					alert('Wrong username or password');
				} else {
					alert('Server error, try again later');
				}
			}
		});
	}

	getCurrentUser() {
		return this.currentUser;
	}
}
