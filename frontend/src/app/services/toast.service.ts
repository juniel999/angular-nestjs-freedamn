import { Injectable, createComponent, ApplicationRef, EnvironmentInjector, inject } from '@angular/core';
import { ToastComponent } from '../components/toast/toast.component';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private appRef = inject(ApplicationRef);
  private environmentInjector = inject(EnvironmentInjector);

  show(message: string, type: 'success' | 'error' = 'success', duration: number = 3000): void {
    // Create the component
    const toastComponentRef = createComponent(ToastComponent, {
      environmentInjector: this.environmentInjector,
    });
    
    // Set inputs
    toastComponentRef.setInput('message', message);
    toastComponentRef.setInput('type', type);
    toastComponentRef.setInput('duration', duration);
    
    // Append to the DOM
    document.body.appendChild(toastComponentRef.location.nativeElement);
    
    // Attach to change detection
    this.appRef.attachView(toastComponentRef.hostView);
    
    // Clean up after duration
    setTimeout(() => {
      this.appRef.detachView(toastComponentRef.hostView);
      toastComponentRef.location.nativeElement.remove();
    }, duration);
  }
} 