import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

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

  // ✅ Base URL with /transactions
  private apiUrl = `${environment.apiUrl}/transactions`;

  constructor(private http: HttpClient) {}

  getByCampaign(campaignId: number): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/campaign/${campaignId}`);
  }

  create(
    data: { campaign_id: number; type: string; amount: number }
  ): Observable<Transaction> {
    return this.http.post<Transaction>(this.apiUrl, data);
  }
}
