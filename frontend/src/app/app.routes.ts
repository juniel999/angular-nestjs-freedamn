import { Routes } from '@angular/router';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'signup', component: SignUpComponent },
  // { path: '', redirectTo: '/', pathMatch: 'full' }
];
