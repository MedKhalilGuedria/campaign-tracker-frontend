import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignDateFilterComponent } from './campaign-date-filter.component';

describe('CampaignDateFilterComponent', () => {
  let component: CampaignDateFilterComponent;
  let fixture: ComponentFixture<CampaignDateFilterComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CampaignDateFilterComponent]
    });
    fixture = TestBed.createComponent(CampaignDateFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
