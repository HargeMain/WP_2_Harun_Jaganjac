import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ErrorModalComponent } from './app-error-modal';

describe('AppErrorModal', () => {
  let component: ErrorModalComponent;
  let fixture: ComponentFixture<ErrorModalComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ErrorModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });
  
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
