import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from './environment';

export interface AuthUser {
  id: number;
  username: string;
  nombre: string;
  rol: string;
  mustChangePassword?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private storageKey = 'persianeitor_user';
  private currentUserSubject: BehaviorSubject<AuthUser | null>;
  currentUser$: Observable<AuthUser | null>;

  constructor(private http: HttpClient) {
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(storedUser);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(username: string, password: string): Observable<{ user: AuthUser }> {
    return this.http.post<{ user: AuthUser }>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap((response) => this.setUser(response.user))
    );
  }

  forgotPassword(username: string, recaptchaToken: string) {
    return this.http.post<any>(`${this.apiUrl}/forgot`, { username, recaptchaToken });
  }

  resetPassword(token: string, password: string) {
    return this.http.post<any>(`${this.apiUrl}/reset`, { token, password });
  }

  changePassword(userId: number, currentPassword: string, newPassword: string) {
    return this.http.post<any>(`${this.apiUrl}/change-password`, { userId, currentPassword, newPassword });
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.currentUserSubject.next(null);
  }

  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  private setUser(user: AuthUser): void {
    localStorage.setItem(this.storageKey, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  updateCurrentUser(partial: Partial<AuthUser>): void {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return;
    }

    this.setUser({ ...currentUser, ...partial });
  }

  private getStoredUser(): AuthUser | null {
    const rawUser = localStorage.getItem(this.storageKey);
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      return null;
    }
  }
}