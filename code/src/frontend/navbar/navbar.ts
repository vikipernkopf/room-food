import { Component } from '@angular/core';
import {NgOptimizedImage} from '@angular/common';
import {RouterLink, RouterLinkActive} from '@angular/router';

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

}
