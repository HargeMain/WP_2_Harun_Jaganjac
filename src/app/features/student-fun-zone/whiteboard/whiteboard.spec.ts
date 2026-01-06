import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WhiteboardPageComponent } from './whiteboard';

describe('WhiteboardPageComponent', () => {
  let component: WhiteboardPageComponent;
  let fixture: ComponentFixture<WhiteboardPageComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhiteboardPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WhiteboardPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
