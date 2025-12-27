import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DailyReflection } from './daily-reflection';

describe('DailyReflection', () => {
  let component: DailyReflection;
  let fixture: ComponentFixture<DailyReflection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DailyReflection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DailyReflection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
