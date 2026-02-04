import { TestBed } from '@angular/core/testing';

import { CampaignDateFilterService } from './campaign-date-filter.service';

describe('CampaignDateFilterService', () => {
  let service: CampaignDateFilterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CampaignDateFilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
