import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Goal {
  id: number;
  campaign_id: number;
  title: string;
  target_amount: number;
  current_amount: number;
  progress_percentage: number;
  remaining_amount: number;
  days_remaining: number | null;
  deadline: string | null;
  status: 'active' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface CreateGoalData {
  campaign_id: number;
  title: string;
  target_amount: number;
  deadline?: string;
}

export interface UpdateGoalData {
  title?: string;
  target_amount?: number;
  deadline?: string;
  status?: 'active' | 'completed' | 'failed';
  current_amount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GoalService {
  private apiUrl = `${environment.apiUrl}/goals`;

  constructor(private http: HttpClient) {}

  getByCampaign(campaignId: number): Observable<Goal[]> {
    return this.http.get<Goal[]>(`${this.apiUrl}/campaign/${campaignId}`);
  }

  create(data: CreateGoalData): Observable<Goal> {
    return this.http.post<Goal>(this.apiUrl, data);
  }

  update(goalId: number, data: UpdateGoalData): Observable<Goal> {
    return this.http.patch<Goal>(`${this.apiUrl}/${goalId}`, data);
  }

  updateProgress(goalId: number): Observable<Goal> {
    return this.http.patch<Goal>(`${this.apiUrl}/${goalId}/update-progress`, {});
  }

  delete(goalId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${goalId}`);
  }
}