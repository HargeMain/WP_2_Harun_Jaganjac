import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizPageComponent } from './quiz';

describe('QuizPageComponent', () => {
  let component: QuizPageComponent;
  let fixture: ComponentFixture<QuizPageComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
