import { Routes } from '@angular/router';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { AppComponent } from './app.component';

export const routes: Routes = [
  { path: '', component: AppComponent },
  { path: 'signup', component: SignUpComponent },
  // { path: '', redirectTo: '/', pathMatch: 'full' }
];
