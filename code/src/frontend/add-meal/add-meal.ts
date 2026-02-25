import { Component } from '@angular/core';
import { PopUp} from './pop-up/pop-up';

@Component({
  selector: 'app-add-meal',
	standalone: true,
  imports: [PopUp],
  templateUrl: './add-meal.html',
  styleUrl: './add-meal.scss',
})
export class AddMeal {
	isPopupVisible = false;

	togglePopup() {
		this.isPopupVisible = !this.isPopupVisible;
	}
}
