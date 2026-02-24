import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignUp } from './sign-up';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideLocationMocks} from '@angular/common/testing';

describe('SignUp', () => {
  	let component: SignUp;
  	let fixture: ComponentFixture<SignUp>;

  	beforeEach(async () => {
    	await TestBed.configureTestingModule({
			imports: [SignUp],
			providers: [
				provideHttpClientTesting(),
				provideRouter([]),
				provideLocationMocks()
			]
    	}).compileComponents();

    	fixture = TestBed.createComponent(SignUp);
    	component = fixture.componentInstance;
    	await fixture.whenStable();
  	});

  	it('should create', () => {
    	expect(component).toBeTruthy();
  	});
});
