import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BingoPageComponent } from './bingo';

describe('BingoPageComponent', () => {
  let component: BingoPageComponent;
  let fixture: ComponentFixture<BingoPageComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BingoPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BingoPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
