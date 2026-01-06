import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KanbanPageComponent } from './kanban';

describe('KanbanPageComponent', () => {
  let component: KanbanPageComponent;
  let fixture: ComponentFixture<KanbanPageComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KanbanPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KanbanPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
