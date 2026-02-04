import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CampaignModule } from './modules/campaign/campaign.module';
import { CampaignDateFilterComponent } from './modules/campaign/components/campaign-date-filter/campaign-date-filter.component';

@NgModule({
  declarations: [
    AppComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    CampaignModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }