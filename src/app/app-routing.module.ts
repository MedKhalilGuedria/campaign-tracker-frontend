import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CampaignListComponent } from './modules/campaign/components/campaign-list/campaign-list.component';
import { CampaignCreateComponent } from './modules/campaign/components/campaign-create/campaign-create.component';
import { CampaignDetailComponent } from './modules/campaign/components/campaign-detail/campaign-detail.component';

const routes: Routes = [
  { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
  { path: 'campaigns', component: CampaignListComponent },
  { path: 'campaigns/create', component: CampaignCreateComponent },
  { path: 'campaigns/:id', component: CampaignDetailComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }