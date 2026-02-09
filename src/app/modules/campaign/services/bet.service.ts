import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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
  stake?: number | null;
}

export interface UpdateBetData {
  result: string;
  profit_loss?: number;
}

@Injectable({
  providedIn: 'root'
})
export class BetService {
  private apiUrl = `${environment.apiUrl}/bets`;

  constructor(private http: HttpClient) {}

  getByCampaign(campaignId: number): Observable<Bet[]> {
    return this.http.get<Bet[]>(`${this.apiUrl}/campaign/${campaignId}`);
  }

  create(data: CreateBetData): Observable<Bet> {
    return this.http.post<Bet>(this.apiUrl, data);
  }

  updateResult(betId: number, result: string, profitLoss?: number): Observable<Bet> {
    const data: UpdateBetData = { result };
    if (profitLoss !== undefined) {
      data.profit_loss = profitLoss;
    }
    return this.http.patch<Bet>(`${this.apiUrl}/${betId}`, data);
  }

  settleBet(betId: number, result: 'win' | 'loss'): Observable<Bet> {
    return this.http.patch<Bet>(`${this.apiUrl}/${betId}/settle?result=${result}`, {});
  }

  updateBet(betId: number, data: UpdateBetData): Observable<Bet> {
    return this.http.patch<Bet>(`${this.apiUrl}/${betId}`, data);
  }

   getAllBets(): Observable<Bet[]> {
    return this.http.get<Bet[]>(`${this.apiUrl}/all`);
  }

  getCampaignBets(campaignId: number): Observable<Bet[]> {
    return this.http.get<Bet[]>(`${this.apiUrl}/campaign/${campaignId}`);
  }
  
}