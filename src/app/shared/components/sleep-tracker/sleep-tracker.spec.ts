import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SleepTrackerComponent } from './sleep-tracker';

describe('SleepTrackerComponent', () => {
  let component: SleepTrackerComponent;
  let fixture: ComponentFixture<SleepTrackerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SleepTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SleepTrackerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
