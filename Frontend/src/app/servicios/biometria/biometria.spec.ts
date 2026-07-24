import { TestBed } from '@angular/core/testing';

import { Biometria } from './biometria';

describe('Biometria', () => {
  let service: Biometria;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Biometria);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
