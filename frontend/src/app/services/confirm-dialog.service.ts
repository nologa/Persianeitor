import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private dialogSubject = new BehaviorSubject<ConfirmDialogData | null>(null);
  private resultSubject = new BehaviorSubject<boolean | null>(null);

  dialog$ = this.dialogSubject.asObservable();
  result$ = this.resultSubject.asObservable();

  confirm(data: ConfirmDialogData): Observable<boolean> {
    this.dialogSubject.next(data);
    return new Observable(observer => {
      const subscription = this.result$.subscribe(result => {
        if (result !== null) {
          observer.next(result);
          observer.complete();
          this.resultSubject.next(null);
        }
      });
      return () => subscription.unsubscribe();
    });
  }

  setResult(result: boolean): void {
    this.resultSubject.next(result);
  }

  closeDialog(): void {
    this.dialogSubject.next(null);
  }
}
