import { Component, signal } from '@angular/core';
import {Login} from '../login/login';
import {RouterOutlet} from '@angular/router';

@Component({
	selector: 'app-root',
	templateUrl: './app.html',
	imports: [
		RouterOutlet
	],
	styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('roomFood');

  onButtonClick() {
    console.log("hi");
  }
}
