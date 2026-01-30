import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BetCreateComponent } from './bet-create.component';

describe('BetCreateComponent', () => {
  let component: BetCreateComponent;
  let fixture: ComponentFixture<BetCreateComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [BetCreateComponent]
    });
    fixture = TestBed.createComponent(BetCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
