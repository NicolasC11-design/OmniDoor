import { TestBed } from '@angular/core/testing';

import { Acceso } from './acceso';

describe('Acceso', () => {
  let service: Acceso;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Acceso);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
