import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistorialReportes } from './historial-reportes';

describe('HistorialReportes', () => {
  let component: HistorialReportes;
  let fixture: ComponentFixture<HistorialReportes>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialReportes],
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialReportes);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
