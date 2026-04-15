import {Component, inject, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';

import {Navbar} from '../navbar/navbar';
import {AuthService} from '../core/auth-service';
@Component({
	selector: 'app-root',
	templateUrl: './app.html',
	imports: [
		RouterOutlet,
		Navbar
	],
	styleUrl: './app.scss'
})
export class App /*implements OnInit*/ {
	// UNCOMMENT IN CASE EVERYTHING BROKE
	//
	/*private authService = inject(AuthService);

	ngOnInit(): void {
		this.authService.restoreSession();
	}*/
}
