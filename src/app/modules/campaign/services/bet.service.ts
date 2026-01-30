import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Bet {
  id: number;
  campaign_id: number;
  sport: string;
  stake: number;
  odds: number;
  result: string;
  profit_loss: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class BetService {
  private apiUrl = 'https://campaign-tracker-3-pn3v.onrender.com/bets';

  constructor(private http: HttpClient) { }

  getByCampaign(campaignId: number): Observable<Bet[]> {
    return this.http.get<Bet[]>(`${this.apiUrl}/campaign/${campaignId}`);
  }

  create(data: { campaign_id: number; sport: string; odds: number }): Observable<Bet> {
    return this.http.post<Bet>(this.apiUrl, data);
  }

   // NEW: Update bet result
  updateResult(betId: number, result: string, profitLoss?: number): Observable<Bet> {
    return this.http.patch<Bet>(`${this.apiUrl}/${betId}`, {
      result,
      profit_loss: profitLoss || 0
    });
  }
}