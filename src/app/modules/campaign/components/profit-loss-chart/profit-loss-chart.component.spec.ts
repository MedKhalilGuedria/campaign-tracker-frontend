import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfitLossChartComponent } from './profit-loss-chart.component';

describe('ProfitLossChartComponent', () => {
  let component: ProfitLossChartComponent;
  let fixture: ComponentFixture<ProfitLossChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ProfitLossChartComponent]
    });
    fixture = TestBed.createComponent(ProfitLossChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
