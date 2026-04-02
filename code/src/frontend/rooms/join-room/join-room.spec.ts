import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter } from '@angular/router';

import { JoinRoom } from './join-room';

describe('JoinRoom', () => {
  let component: JoinRoom;
  let fixture: ComponentFixture<JoinRoom>;

  beforeEach(async () => {
	await TestBed.configureTestingModule({
	  imports: [JoinRoom],
	  providers: [
		provideHttpClient(),
		provideHttpClientTesting(),
		provideRouter([]),
		provideLocationMocks()
	  ]
	}).compileComponents();

	fixture = TestBed.createComponent(JoinRoom);
	component = fixture.componentInstance;
	fixture.detectChanges();
  });

  it('should create', () => {
	expect(component).toBeTruthy();
  });
});

