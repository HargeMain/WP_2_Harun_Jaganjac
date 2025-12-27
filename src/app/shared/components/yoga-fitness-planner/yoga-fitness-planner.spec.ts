import { ComponentFixture, TestBed } from '@angular/core/testing';

import { YogaFitnessPlannerComponent } from './yoga-fitness-planner';

describe('YogaFitnessPlannerComponent', () => {
  let component: YogaFitnessPlannerComponent;
  let fixture: ComponentFixture<YogaFitnessPlannerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [YogaFitnessPlannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(YogaFitnessPlannerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
