import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisionBoardPageComponent } from './vision-board';

describe('VisionBoardPageComponent', () => {
  let component: VisionBoardPageComponent;
  let fixture: ComponentFixture<VisionBoardPageComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisionBoardPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisionBoardPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
