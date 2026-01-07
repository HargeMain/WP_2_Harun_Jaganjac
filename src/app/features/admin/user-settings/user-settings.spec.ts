import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserSettingsPageComponent } from './user-settings';

describe('UserSettingsPageComponent', () => {
  let component: UserSettingsPageComponent;
  let fixture: ComponentFixture<UserSettingsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserSettingsPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserSettingsPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
