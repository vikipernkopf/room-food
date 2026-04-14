import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { RoomManagementView } from './room-management-view';

describe('RoomManagementView', () => {
  let component: RoomManagementView;
  let fixture: ComponentFixture<RoomManagementView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomManagementView],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ code: 'A1' })) }
        }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoomManagementView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
