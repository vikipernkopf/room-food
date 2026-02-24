import { LoginService} from './login/login-service';
import { Unit } from './unit';

const unit = new Unit(false);
const loginService = new LoginService(unit);
console.log(loginService.addUser({username:"antonio", password:"1234"}));
unit.complete(true);
