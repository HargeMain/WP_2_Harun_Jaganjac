import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarTracker } from './calendar-tracker';

describe('CalendarTracker', () => {
  let component: CalendarTracker;
  let fixture: ComponentFixture<CalendarTracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarTracker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarTracker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
