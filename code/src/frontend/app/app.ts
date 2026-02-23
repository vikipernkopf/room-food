import { Component, signal } from '@angular/core';
import {Login} from '../login/login';

@Component({
	selector: 'app-root',
	templateUrl: './app.html',
	imports: [
		Login
	],
	styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('roomFood');

  onButtonClick() {
    console.log("hi");
  }
}
