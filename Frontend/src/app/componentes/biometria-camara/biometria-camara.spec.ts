import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiometriaCamara } from './biometria-camara';

describe('BiometriaCamara', () => {
  let component: BiometriaCamara;
  let fixture: ComponentFixture<BiometriaCamara>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiometriaCamara],
    }).compileComponents();

    fixture = TestBed.createComponent(BiometriaCamara);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
