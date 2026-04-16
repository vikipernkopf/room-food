import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';

import { Rooms } from './rooms';

describe('Rooms', () => {
  let component: Rooms;
  let fixture: ComponentFixture<Rooms>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rooms],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideLocationMocks()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rooms);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
