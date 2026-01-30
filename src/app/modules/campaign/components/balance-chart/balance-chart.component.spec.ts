import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceChartComponent } from './balance-chart.component';

describe('BalanceChartComponent', () => {
  let component: BalanceChartComponent;
  let fixture: ComponentFixture<BalanceChartComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BalanceChartComponent]
    });
    fixture = TestBed.createComponent(BalanceChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
