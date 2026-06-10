import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  loading = false;
  error = '';
  message = '';
  token: string | null = null;
  isAuthenticatedChange = false;

  form = this.fb.group({
    currentPassword: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', Validators.required]
  });

  constructor(private fb: FormBuilder, private route: ActivatedRoute, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (this.token) {
      this.isAuthenticatedChange = false;
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.error = 'Token inválido o sesión no iniciada';
      return;
    }

    this.isAuthenticatedChange = true;
    this.form.get('currentPassword')?.setValidators([Validators.required]);
    this.form.get('currentPassword')?.updateValueAndValidity();
  }

  submit(): void {
    this.error = '';
    if (this.form.invalid) { this.error = 'Completa la contraseña (mín 6 caracteres)'; return; }
    const pw = this.form.value.password || '';
    const conf = this.form.value.confirm || '';
    if (pw !== conf) { this.error = 'Las contraseñas no coinciden'; return; }

    if (this.isAuthenticatedChange) {
      const currentUser = this.auth.getCurrentUser();
      const currentPassword = this.form.value.currentPassword || '';

      if (!currentUser) {
        this.error = 'Sesión no válida';
        return;
      }

      this.loading = true;
      this.auth.changePassword(currentUser.id, currentPassword, pw).subscribe({
        next: (res) => {
          this.loading = false;
          this.message = res?.message || 'Contraseña actualizada correctamente';
          this.auth.updateCurrentUser({ mustChangePassword: false });
          setTimeout(() => this.router.navigate(['/calendario']), 1200);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.error || 'Error al cambiar la contraseña';
        }
      });
      return;
    }

    if (!this.token) { this.error = 'Token inválido'; return; }

    this.loading = true;
    this.auth.resetPassword(this.token, pw).subscribe({
      next: (res) => { this.loading = false; this.message = res?.message || 'Contraseña restablecida'; setTimeout(() => this.router.navigate(['/login']), 1500); },
      error: (err) => { this.loading = false; this.error = err?.error?.error || 'Error al restablecer'; }
    });
  }
}
