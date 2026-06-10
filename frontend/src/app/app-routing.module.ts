import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ForgotPasswordComponent } from './components/login/forgot-password.component';
import { ResetPasswordComponent } from './components/login/reset-password.component';
import { HomeComponent } from './components/home/home.component';

import { ClientesListComponent } from './components/clientes/clientes-list/clientes-list.component';
import { ClientesFormComponent } from './components/clientes/clientes-form/clientes-form.component';

import { PedidosListComponent } from './components/pedidos/pedidos-list/pedidos-list.component'; 
import { PedidosFormComponent } from './components/pedidos/pedidos-form/pedidos-form.component'; 
import { PedidosViewComponent } from './components/pedidos/pedidos-view/pedidos-view.component'; 
import { AgendaComponent } from './components/agenda/agenda.component';
 import { FabricaListComponent } from './components/fabrica/fabrica-list/fabrica-list.component';
import { FabricaFormComponent } from './components/fabrica/fabrica-form/fabrica-form.component';
import { FabricaViewComponent } from './components/fabrica/fabrica-view/fabrica-view.component';

import { NotasListComponent } from './components/notas/notas-list/notas-list.component';
import { NotasFormComponent } from './components/notas/notas-form/notas-form.component';
// import { ContabilidadResumenComponent } from './components/contabilidad/contabilidad-resumen/contabilidad-resumen.component'; 
import { authGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot', component: ForgotPasswordComponent },
  { path: 'reset', component: ResetPasswordComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'calendario', component: HomeComponent, canActivate: [authGuard] },
  { path: 'agenda', component: AgendaComponent, canActivate: [authGuard] },
  { path: 'clientes', component: ClientesListComponent, canActivate: [authGuard] },
  { path: 'clientes/nuevo', component: ClientesFormComponent, canActivate: [authGuard] },
  { path: 'clientes/editar/:id', component: ClientesFormComponent, canActivate: [authGuard] },
  { path: 'pedidos', component: PedidosListComponent, canActivate: [authGuard] }, 
  { path: 'pedidos/nuevo', component: PedidosFormComponent, canActivate: [authGuard] },
  { path: 'pedidos/view/:id', component: PedidosViewComponent, canActivate: [authGuard] },
  { path: 'pedidos/editar/:id', component: PedidosFormComponent, canActivate: [authGuard] },
  { path: 'pedidos/:id', component: PedidosViewComponent, canActivate: [authGuard] }, 
  { path: 'fabrica', component: FabricaListComponent, canActivate: [authGuard] },
  { path: 'fabrica/nuevo', component: FabricaFormComponent, canActivate: [authGuard] },
  { path: 'fabrica/view/:id', component: FabricaViewComponent, canActivate: [authGuard] },
  { path: 'fabrica/editar/:id', component: FabricaFormComponent, canActivate: [authGuard] },
  { path: 'fabrica/:id', component: FabricaViewComponent, canActivate: [authGuard] }, 
  { path: 'notas', component: NotasListComponent, canActivate: [authGuard] },
  { path: 'notas/nueva', component: NotasFormComponent, canActivate: [authGuard] },
  { path: 'notas/editar/:id', component: NotasFormComponent, canActivate: [authGuard] },
  // { path: 'contabilidad', component: ContabilidadResumenComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
