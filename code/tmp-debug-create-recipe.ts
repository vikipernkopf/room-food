import { Unit } from './src/backend/unit';
import { RecipesService } from './src/backend/recipes/recipes-service';

(async () => {
  const unit = new Unit(false);
  try {
    const svc = new RecipesService(unit);
    const payload = {
      authorUsername: 'alice',
      name: 'Debug Pancakes',
      description: 'Test desc',
      image: null,
      mealTypes: ['breakfast'],
      visibility: 'private',
      ingredients: [
        { name: 'Flour', measurement: 'g', amount: 200 },
        { name: 'Eggs', measurement: 'pcs', amount: 2 }
      ],
      instructions: 'Mix and fry.'
    } as any;

    const result = svc.createRecipe(payload);
    console.log('createRecipe result:', result);

    const db = unit.prepare('select * from RecipeIngredient').all();
    console.log('RecipeIngredient rows:', db);

    unit.complete(true);
  } catch (err) {
    unit.complete(false);
    console.error('Error in debug create recipe:', err);
  }
})();

