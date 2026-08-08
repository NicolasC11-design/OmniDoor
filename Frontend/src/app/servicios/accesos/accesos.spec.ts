import { TestBed } from '@angular/core/testing';

import { Accesos } from './accesos';

describe('Accesos', () => {
  let service: Accesos;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Accesos);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
