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

export interface CreateBetData {
  campaign_id: number;
  sport: string;
  odds: number;
  stake?: number | null;  // Allow both null and undefined
}

export interface UpdateBetData {
  result: string;
  profit_loss: number;
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

  create(data: CreateBetData): Observable<Bet> {
    return this.http.post<Bet>(this.apiUrl, data);
  }

  // Update bet result with explicit parameters
  updateResult(betId: number, result: string, profitLoss: number = 0): Observable<Bet> {
    return this.http.patch<Bet>(`${this.apiUrl}/${betId}`, {
      result,
      profit_loss: profitLoss
    });
  }

  // Alternative update method using UpdateBetData interface
  updateBet(betId: number, data: UpdateBetData): Observable<Bet> {
    return this.http.patch<Bet>(`${this.apiUrl}/${betId}`, data);
  }
}