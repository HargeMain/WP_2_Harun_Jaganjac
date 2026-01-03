import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadingTrackerComponent } from './reading-tracker';

describe('ReadingTrackerComponent', () => {
  let component: ReadingTrackerComponent;
  let fixture: ComponentFixture<ReadingTrackerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReadingTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReadingTrackerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
