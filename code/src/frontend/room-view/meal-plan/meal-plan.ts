import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Meal} from '../../../backend/model';

@Component({
  selector: 'app-meal-plan',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './meal-plan.html',
  styleUrl: './meal-plan.scss',
})
export class MealPlan {
	@Input() meal: Meal | null = null;
	@Input() index: number = 0;
  @Input() onEdit: ((meal: Meal) => void) | null = null;

  public onEditClick(): void {
    if (this.meal && this.onEdit) {
      this.onEdit(this.meal);
    }
  }
}
