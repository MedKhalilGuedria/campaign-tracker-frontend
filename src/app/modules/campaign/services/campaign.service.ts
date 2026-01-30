import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Campaign {
  id: number;
  name: string;
  start_balance: number;
  current_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private apiUrl = 'https://campaign-tracker-3-pn3v.onrender.com/campaigns';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(this.apiUrl);
  }

  get(id: number): Observable<Campaign> {
    return this.http.get<Campaign>(`${this.apiUrl}/${id}`);
  }

  create(data: { name: string; start_balance: number }): Observable<Campaign> {
    return this.http.post<Campaign>(this.apiUrl, data);
  }
}