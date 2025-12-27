import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarTrackerComponent } from './calendar-tracker';

describe('CalendarTrackerComponent', () => {
  let component: CalendarTrackerComponent;
  let fixture: ComponentFixture<CalendarTrackerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarTrackerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
