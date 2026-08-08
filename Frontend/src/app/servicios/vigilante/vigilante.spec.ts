import { TestBed } from '@angular/core/testing';

import { Vigilante } from './vigilante/vigilante';

describe('Vigilante', () => {
  let service: Vigilante;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Vigilante);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
