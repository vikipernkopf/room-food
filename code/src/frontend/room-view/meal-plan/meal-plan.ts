import {Component, EventEmitter, Input, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Meal} from '../../../backend/model';

@Component({
  selector: 'app-meal-plan',
  imports: [CommonModule],
  outputs: ['editMeal'],
  templateUrl: './meal-plan.html',
  styleUrl: './meal-plan.scss',
})
export class MealPlan {
	@Input() meal: Meal | null = null;
	@Input() index: number = 0;
  @Output() editMeal = new EventEmitter<Meal>();

  public onEditClick(): void {
    if (this.meal) {
      this.editMeal.emit(this.meal);
    }
  }
}
