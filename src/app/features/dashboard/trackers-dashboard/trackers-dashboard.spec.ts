import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrackersDashboardComponent } from './trackers-dashboard';

describe('TrackersDashboardComponent', () => {
  let component: TrackersDashboardComponent;
  let fixture: ComponentFixture<TrackersDashboardComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackersDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrackersDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
