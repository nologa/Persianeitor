import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // Import CommonModule explicitly
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ServiceWorkerModule } from '@angular/service-worker';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { ForgotPasswordComponent } from './components/login/forgot-password.component';
import { ResetPasswordComponent } from './components/login/reset-password.component';

// Componentes
import { ClientesListComponent } from './components/clientes/clientes-list/clientes-list.component';
import { ClientesFormComponent } from './components/clientes/clientes-form/clientes-form.component';
import { PedidosListComponent } from './components/pedidos/pedidos-list/pedidos-list.component'; 
import { PedidosFormComponent } from './components/pedidos/pedidos-form/pedidos-form.component'; 
import { PedidosViewComponent } from './components/pedidos/pedidos-view/pedidos-view.component'; 
import { HomeComponent } from './components/home/home.component';
// Componentes
import { AgendaComponent } from './components/agenda/agenda.component'; 
import { FabricaListComponent } from './components/fabrica/fabrica-list/fabrica-list.component'; 
import { FabricaFormComponent } from './components/fabrica/fabrica-form/fabrica-form.component'; 
import { FabricaViewComponent } from './components/fabrica/fabrica-view/fabrica-view.component'; 
import { NotasListComponent } from './components/notas/notas-list/notas-list.component';
import { NotasFormComponent } from './components/notas/notas-form/notas-form.component';
// import { ContabilidadResumenComponent } from './components/contabilidad/contabilidad-resumen/contabilidad-resumen.component'; // Updated path
import { MoneyPipe } from './pipes/money.pipe';
import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ForgotPasswordComponent,
    ResetPasswordComponent,
    ClientesListComponent,
    ClientesFormComponent,
    PedidosListComponent, 
    PedidosFormComponent, 
    PedidosViewComponent, 
    HomeComponent,
    AgendaComponent,
    FabricaListComponent, 
    FabricaFormComponent, 
    FabricaViewComponent, 
    NotasFormComponent,
    // ContabilidadResumenComponent,
    MoneyPipe,
    ConfirmDialogComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule, // Necesario para FabricaFormComponent
    CommonModule, // Necesario para pipes y directivas en componentes no standalone
    NotasListComponent, // NotasListComponent es standalone, por eso va en imports

    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: true,
      registrationStrategy: 'registerImmediately'
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }