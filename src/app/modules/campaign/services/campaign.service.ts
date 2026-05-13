import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Campaign {
  id: number;
  name: string;
  start_balance: number;
  current_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  created_at: string;
}

export interface CampaignStats {
  campaign_id: number;
  campaign_name: string;
  total_bets: number;
  total_staked: number;
  total_profit_loss: number;
  wins: number;
  losses: number;
  pending: number;
  void: number;
  win_rate: number;
  roi: number;
  avg_odds: number;
  biggest_win: number;
  biggest_loss: number;
  deposits: number;
  withdrawals: number;
  net_flow: number;
  balance_utilization: number;
  profit_percentage: number;
  current_balance: number;
  start_balance: number;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {

  private apiUrl = `${environment.apiUrl}/campaigns`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(this.apiUrl);
  }

  get(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.apiUrl}/${id}`);
  }

  create(data: { name: string; start_balance: number }): Observable<Campaign> {
    return this.http.post<Campaign>(this.apiUrl, data);
  }

  getCampaignStats(campaignId: number): Observable<CampaignStats> {
    return this.http.get<CampaignStats>(`${this.apiUrl}/${campaignId}/stats`);
  }

  getAllCampaignsStats(): Observable<CampaignStats[]> {
    return this.http.get<CampaignStats[]>(`${this.apiUrl}/stats/all`);
  }
}