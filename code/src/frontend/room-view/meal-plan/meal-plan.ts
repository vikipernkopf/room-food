import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Meal} from '../../../backend/model';

@Component({
  selector: 'app-meal-plan',
  imports: [CommonModule],
  templateUrl: './meal-plan.html',
  styleUrl: './meal-plan.scss',
})
export class MealPlan {
	@Input() meal: Meal | null = null;
}
