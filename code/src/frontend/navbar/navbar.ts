import { Component, computed } from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';
import { AuthService } from '../core/auth-service';
import {User} from '../../backend/model';

@Component({
  selector: 'app-navbar',
	imports: [
		NgOptimizedImage,
		RouterLink,
		RouterLinkActive
	],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  protected readonly profileLink;
  protected readonly profileQueryParams;
  protected readonly isLoggedIn;

  constructor(private readonly authService: AuthService) {
	this.profileLink = computed(() => {
	  const username = this.authService.currentUser()?.username;
	  return username ? ['/profile', username] : ['/login'];
	});

	this.profileQueryParams = computed(() => {
	  const username = this.authService.currentUser()?.username;
	  return username ? null : { returnUrl: '/profile' };
	});

	this.isLoggedIn = computed(() => {
	  return this.authService.currentUser() !== null;
	});
  }

  logout(): void {
	  this.authService.logout();
  }

}
