import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignDetailComponent } from './campaign-detail.component';

describe('CampaignDetailComponent', () => {
  let component: CampaignDetailComponent;
  let fixture: ComponentFixture<CampaignDetailComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CampaignDetailComponent]
    });
    fixture = TestBed.createComponent(CampaignDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
