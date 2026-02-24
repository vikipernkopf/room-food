import { LoginService} from './login/login-service';
import { Unit } from './unit';

const unit = new Unit(false);
const loginService = new LoginService(unit);
console.log(loginService.addUser({username:"imGonnaCrashOut", password:"ILoveSypAndWmc"}));
unit.complete(true);
