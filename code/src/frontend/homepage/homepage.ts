import {Component} from '@angular/core';
import {Navbar} from '../navbar/navbar';

@Component({
  selector: 'app-homepage',
	imports: [
		Navbar
	],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})

export class Homepage {
}
