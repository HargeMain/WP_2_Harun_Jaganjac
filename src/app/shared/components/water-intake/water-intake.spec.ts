import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterIntakeTrackerComponent } from './water-intake';

describe('WaterIntake', () => {
  let component: WaterIntakeTrackerComponent;
  let fixture: ComponentFixture<WaterIntakeTrackerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WaterIntakeTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterIntakeTrackerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
