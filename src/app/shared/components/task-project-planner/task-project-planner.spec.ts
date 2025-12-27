import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskProjectPlanner } from './task-project-planner';

describe('TaskProjectPlanner', () => {
  let component: TaskProjectPlanner;
  let fixture: ComponentFixture<TaskProjectPlanner>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskProjectPlanner]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaskProjectPlanner);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
