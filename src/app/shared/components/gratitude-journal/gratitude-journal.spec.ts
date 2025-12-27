import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GratitudeJournal } from './gratitude-journal';

describe('GratitudeJournal', () => {
  let component: GratitudeJournal;
  let fixture: ComponentFixture<GratitudeJournal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GratitudeJournal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GratitudeJournal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
