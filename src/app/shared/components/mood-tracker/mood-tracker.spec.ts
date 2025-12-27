import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MoodTracker } from './mood-tracker';

describe('MoodTracker', () => {
  let component: MoodTracker;
  let fixture: ComponentFixture<MoodTracker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MoodTracker]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MoodTracker);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
