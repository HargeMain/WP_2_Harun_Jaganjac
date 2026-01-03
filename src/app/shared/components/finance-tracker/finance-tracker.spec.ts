import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinanceTrackerComponent } from './finance-tracker';

describe('FinanceTrackerComponent', () => {
  let component: FinanceTrackerComponent;
  let fixture: ComponentFixture<FinanceTrackerComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FinanceTrackerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceTrackerComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
