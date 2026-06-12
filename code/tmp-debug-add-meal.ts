import { Unit } from './src/backend/unit';
import { MealManagementService } from './src/backend/meal-management/meal-management-service';

(async () => {
  const unit = new Unit(false);
  try {
    const meal: any = {
      time: new Date('2026-06-15T06:00:00.000Z'),
      endTime: new Date('2026-06-15T07:00:00.000Z'),
      name: 'Debug Test Meal',
      mealType: 'breakfast-0',
      room: 'room-001',
      responsible: 'alice',
      recipeIds: [5,1],
      responsibleUsers: ['bob'],
      cooked: false
    };

    const svc = new MealManagementService(unit);
    const result = svc.addMeal(meal);
    console.log('addMeal result:', result);

    const rows = unit.prepare('select * from MealRecipe').all();
    console.log('MealRecipe rows after add:', rows);
    unit.complete(true);
  } catch (err) {
    unit.complete(false);
    console.error('Error in debug script:', err);
  }
})();

