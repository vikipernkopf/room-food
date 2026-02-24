import { LoginSignUpService } from './login-sign-up/login-sign-up-service';
import { Unit } from './unit';

const unit = new Unit(false);
const loginService = new LoginSignUpService(unit);
console.log(loginService.addUser({username:"antonio", password:"1234"}));
unit.complete(true);
