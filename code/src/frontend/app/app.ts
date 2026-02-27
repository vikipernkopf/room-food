import { Component } from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Navbar} from '../navbar/navbar';

@Component({
	selector: 'app-root',
	templateUrl: './app.html',
	imports: [
		RouterOutlet,
		Navbar
	],
	styleUrl: './app.scss'
})
export class App { }
