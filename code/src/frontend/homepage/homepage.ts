import {Component, signal, WritableSignal} from '@angular/core';
import {AuthService} from '../core/auth-service';
import {AddMeal} from '../add-meal/add-meal';
import {RouterLink} from '@angular/router';
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
