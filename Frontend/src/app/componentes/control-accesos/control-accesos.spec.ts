import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlAccesos } from './control-accesos';

describe('ControlAccesos', () => {
  let component: ControlAccesos;
  let fixture: ComponentFixture<ControlAccesos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlAccesos],
    }).compileComponents();

    fixture = TestBed.createComponent(ControlAccesos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
