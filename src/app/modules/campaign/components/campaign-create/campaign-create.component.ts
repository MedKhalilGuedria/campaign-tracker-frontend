import { Component } from '@angular/core';
import { CampaignService } from '../../services/campaign.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-campaign-create',
  templateUrl: './campaign-create.component.html',
  styleUrls: ['./campaign-create.component.scss']
})
export class CampaignCreateComponent {

  name = '';
  start_amount = 0;

  constructor(
    private service: CampaignService,
    private router: Router
  ) { }

  submit() {
    this.service.create({
      name: this.name,
      start_balance: this.start_amount
    }).subscribe(() => this.router.navigate(['/campaigns']));
  }
}