import { User } from "../../backend/model";
import {Unit} from '../../backend/unit';
import {LoginSignUpService} from '../../backend/login-sign-up/login-sign-up-service';

const alice: User = { username: "alice", password: "secret" };
const bob: User = { username: "bob", password: "hunter2" };

function mockUnit(sequence: object[]): Unit {
	const prepare = vi.fn();
	sequence.forEach((stmt) => prepare.mockReturnValueOnce(stmt));
	return { prepare } as unknown as Unit;
}

describe("LoginSignUpService", () => {
	describe("addUser", () => {
		it("returns 'exists' when the username is already taken", () => {
			const unit = mockUnit([
				{ get: () => alice },           // checkUserExists → found
			]);
			expect(new LoginSignUpService(unit).addUser(alice)).toBe("exists");
		});

		it("returns the new id when insert succeeds", () => {
			const unit = mockUnit([
				{ get: () => undefined },                                  // checkUserExists → not found
				{ run: () => ({ changes: 1, lastInsertRowid: 42 }) },     // INSERT
			]);
			expect(new LoginSignUpService(unit).addUser(alice)).toBe(42);
		});

		it("returns 'error' when insert fails", () => {
			const unit = mockUnit([
				{ get: () => undefined },                                  // checkUserExists → not found
				{ run: () => ({ changes: 0, lastInsertRowid: 0 }) },      // INSERT fails
			]);
			expect(new LoginSignUpService(unit).addUser(alice)).toBe("error");
		});
	});

	describe("deleteUser", () => {
		it("returns 'not_found' when user does not exist", () => {
			const unit = mockUnit([
				{ get: () => undefined },       // checkUserExists → not found
			]);
			expect(new LoginSignUpService(unit).deleteUser("alice")).toBe("not_found");
		});

		it("returns true when deletion succeeds", () => {
			const unit = mockUnit([
				{ get: () => alice },                                      // checkUserExists → found
				{ run: () => ({ changes: 1, lastInsertRowid: 0 }) },      // DELETE
			]);
			expect(new LoginSignUpService(unit).deleteUser("alice")).toBe(true);
		});

		it("returns 'error' when deletion fails", () => {
			const unit = mockUnit([
				{ get: () => alice },                                      // checkUserExists → found
				{ run: () => ({ changes: 0, lastInsertRowid: 0 }) },      // DELETE fails
			]);
			expect(new LoginSignUpService(unit).deleteUser("alice")).toBe("error");
		});
	});

	describe("checkUserExists", () => {
		it("returns true when a row is found", () => {
			const unit = mockUnit([{ get: () => alice }]);
			expect(new LoginSignUpService(unit).checkUserExists("alice")).toBe(true);
		});

		it("returns false when no row is found", () => {
			const unit = mockUnit([{ get: () => undefined }]);
			expect(new LoginSignUpService(unit).checkUserExists("ghost")).toBe(false);
		});
	});

	describe("checkUserExistsId", () => {
		it("returns true when a row is found", () => {
			const unit = mockUnit([{ get: () => alice }]);
			expect(new LoginSignUpService(unit).checkUserExistsId(1)).toBe(true);
		});

		it("returns false when no row is found", () => {
			const unit = mockUnit([{ get: () => undefined }]);
			expect(new LoginSignUpService(unit).checkUserExistsId(99)).toBe(false);
		});
	});

	describe("getAllUsers", () => {
		it("returns all users", () => {
			const unit = mockUnit([{ all: () => [alice, bob] }]);
			expect(new LoginSignUpService(unit).getAllUsers()).toEqual([alice, bob]);
		});

		it("returns an empty array when DB returns undefined", () => {
			const unit = mockUnit([{ all: () => undefined }]);
			expect(new LoginSignUpService(unit).getAllUsers()).toEqual([]);
		});
	});

	describe("getUserById", () => {
		it("returns the user when found", () => {
			const unit = mockUnit([{ get: () => alice }]);
			expect(new LoginSignUpService(unit).getUserById(1)).toEqual(alice);
		});

		it("returns undefined when not found", () => {
			const unit = mockUnit([{ get: () => undefined }]);
			expect(new LoginSignUpService(unit).getUserById(99)).toBeUndefined();
		});
	});

	describe("getUserByUsername", () => {
		it("returns the user when found", () => {
			const unit = mockUnit([{ get: () => alice }]);
			expect(new LoginSignUpService(unit).getUserByUsername("alice")).toEqual(alice);
		});

		it("returns undefined when not found", () => {
			const unit = mockUnit([{ get: () => undefined }]);
			expect(new LoginSignUpService(unit).getUserByUsername("ghost")).toBeUndefined();
		});
	});

	describe("checkLoginAttempt", () => {
		it("returns 'no_user' when username does not exist", () => {
			const unit = mockUnit([{ get: () => undefined }]);
			expect(new LoginSignUpService(unit).checkLoginAttempt("ghost", "any")).toBe("no_user");
		});

		it("returns 'wrong_password' when password does not match", () => {
			const unit = mockUnit([{ get: () => alice }]);
			expect(new LoginSignUpService(unit).checkLoginAttempt("alice", "wrongpass")).toBe("wrong_password");
		});

		it("returns true when credentials are correct", () => {
			const unit = mockUnit([{ get: () => alice }]);
			expect(new LoginSignUpService(unit).checkLoginAttempt("alice", "secret")).toBe(true);
		});
	});

});
