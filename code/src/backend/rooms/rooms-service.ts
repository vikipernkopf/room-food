import {ServiceBase} from '../service-base';
import {Unit} from '../unit';
import {LoginSignUpService} from '../login-sign-up/login-sign-up-service';
import {MealManagementService} from '../meal-management/meal-management-service';

export class RoomsService extends ServiceBase {

	private meals:MealManagementService = new MealManagementService(this.unit);

	constructor(unit: Unit) {
		super(unit);
	}

	private CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	private MAX_ATTEMPTS = 1000;

	private generateRoomCode(length = 6): string {
		return Array.from({ length }, () =>
			this.CHARS[Math.floor(Math.random() * this.CHARS.length)]
		).join('');
	}
}
