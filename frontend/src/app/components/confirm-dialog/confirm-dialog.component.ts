import { Component } from '@angular/core';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  constructor(public confirmDialogService: ConfirmDialogService) {}

  get dialog$() {
    return this.confirmDialogService.dialog$;
  }

  onConfirm(): void {
    this.confirmDialogService.setResult(true);
    this.confirmDialogService.closeDialog();
  }

  onCancel(): void {
    this.confirmDialogService.setResult(false);
    this.confirmDialogService.closeDialog();
  }
}
