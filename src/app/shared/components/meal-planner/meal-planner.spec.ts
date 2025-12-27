import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MealTrackerComponent } from './meal-planner';

describe('MealTrackerComponent', () => {
  let component: MealTrackerComponent;
  let fixture: ComponentFixture<MealTrackerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MealTrackerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
