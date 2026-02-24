import { Component } from '@angular/core';
import {AuthService} from '../core/auth-service';

@Component({
  selector: 'app-homepage',
  imports: [],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})

export class homepage{
	userName: string = '';

	constructor(private authService: AuthService) {
		const user = this.authService.getCurrentUser();
		this.userName = user ? user.username : 'Guest';
	}
}
