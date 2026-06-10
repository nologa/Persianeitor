import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { SyncService } from './services/sync.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Persianeitor';
  isOnline = true;
  menuOpen = false;
  showNavbar = false;

  private routerSubscription?: Subscription;

  constructor(
    private syncService: SyncService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isOnline = this.syncService.isConnectionOnline();
    window.addEventListener('online', () => this.onlineStatusChange());
    window.addEventListener('offline', () => this.onlineStatusChange());
    this.updateShellState();
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateShellState());
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', () => this.onlineStatusChange());
    window.removeEventListener('offline', () => this.onlineStatusChange());
    this.routerSubscription?.unsubscribe();
  }

  updateShellState(): void {
    this.showNavbar = this.authService.isLoggedIn() && !this.router.url.startsWith('/login');
  }

  onlineStatusChange(): void {
    this.isOnline = this.syncService.isConnectionOnline();
    if (this.isOnline) {
      this.syncService.syncData();
    }
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.menuOpen = false;
    this.showNavbar = false;
    this.router.navigate(['/login']);
  }
}
