import { Component } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-error-page',
	imports: [
		RouterLink,
		RouterLinkActive,
		MatButton
	],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage {

}
