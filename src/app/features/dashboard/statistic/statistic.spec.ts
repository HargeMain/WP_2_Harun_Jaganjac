import { ComponentFixture, TestBed } from '@angular/core/testing';

import {  StatisticPageComponent } from './statistic';

describe('StatisticPageComponent', () => {
  let component: StatisticPageComponent;
  let fixture: ComponentFixture<StatisticPageComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatisticPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatisticPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
