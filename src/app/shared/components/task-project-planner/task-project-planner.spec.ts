import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskProjectPlannerComponent } from './task-project-planner';

describe('TaskProjectPlannerComponent', () => {
  let component: TaskProjectPlannerComponent;
  let fixture: ComponentFixture<TaskProjectPlannerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskProjectPlannerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskProjectPlannerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
