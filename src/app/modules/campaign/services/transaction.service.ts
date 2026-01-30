import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Transaction {
  id: number;
  campaign_id: number;
  type: string;
  amount: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private apiUrl = 'https://campaign-tracker-3-pn3v.onrender.com/transactions';

  constructor(private http: HttpClient) { }

  getByCampaign(campaignId: number): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/campaign/${campaignId}`);
  }

  create(data: { campaign_id: number; type: string; amount: number }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}