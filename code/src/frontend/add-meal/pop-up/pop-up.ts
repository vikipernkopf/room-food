import {Component, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'app-pop-up',
  imports: [],
  templateUrl: './pop-up.html',
  styleUrl: './pop-up.scss',
})
export class PopUp {
	@Output() close = new EventEmitter<void>();

	closePopup() {
		this.close.emit();
	}
}
