import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {  
  private apiUrl = 'http://localhost:8000/api'; 

  constructor(private http: HttpClient) {}

  register(payload: any) {
    return this.http.post(`${this.apiUrl}/register`, payload);
  }


  login(credentials: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/login/`, credentials).pipe(
    tap(response => {
      if (response && response.access) {
        localStorage.setItem('omni_token', response.access);
      }
    })
  );
}


  isAuthenticated(): boolean {
    const token = localStorage.getItem('omni_token');

    return !!token; 
  }


  logout(): void {
    localStorage.removeItem('omni_token');
  }
}