import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DrawerMenu } from './drawer-menu';

describe('DrawerMenu', () => {
  let component: DrawerMenu;
  let fixture: ComponentFixture<DrawerMenu>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DrawerMenu]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DrawerMenu);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
