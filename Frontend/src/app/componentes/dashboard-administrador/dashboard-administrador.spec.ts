import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardAdministrador } from './dashboard-administrador';

describe('DashboardAdministrador', () => {
  let component: DashboardAdministrador;
  let fixture: ComponentFixture<DashboardAdministrador>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardAdministrador],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardAdministrador);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
