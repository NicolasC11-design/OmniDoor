import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardVigilante } from './dashboard-vigilante';

describe('DashboardVigilante', () => {
  let component: DashboardVigilante;
  let fixture: ComponentFixture<DashboardVigilante>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardVigilante],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardVigilante);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
