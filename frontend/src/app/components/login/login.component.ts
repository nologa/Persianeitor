import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  loading = false;
  error = '';
  returnUrl = '/calendario';

  loginForm = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/calendario']);
      return;
    }

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/calendario';
  }

  submit(): void {
    this.error = '';

    if (this.loginForm.invalid) {
      this.error = 'Completa usuario y contraseña.';
      return;
    }

    const username = this.loginForm.value.username?.trim() || '';
    const password = this.loginForm.value.password || '';

    this.loading = true;
    this.authService.login(username, password).subscribe({
      next: () => {
        this.loading = false;
        const currentUser = this.authService.getCurrentUser();
        if (currentUser?.mustChangePassword) {
          this.router.navigate(['/reset']);
          return;
        }
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error) => {
        this.loading = false;
        this.error = error?.error?.error || 'No se pudo iniciar sesión.';
      }
    });
  }
}