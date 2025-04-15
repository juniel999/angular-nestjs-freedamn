import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { ProfileStepComponent } from './onboarding/profile-step/profile-step.component';
import { AvatarStepComponent } from './onboarding/avatar-step/avatar-step.component';
import { TagsStepComponent } from './onboarding/tags-step/tags-step.component';
import { ReviewStepComponent } from './onboarding/review-step/review-step.component';

const routes: Routes = [
  {
    path: '',
    component: OnboardingComponent,
    children: [
      { path: '', redirectTo: 'step-1', pathMatch: 'full' },
      { path: 'step-1', component: ProfileStepComponent },
      { path: 'step-2', component: AvatarStepComponent },
      { path: 'step-3', component: TagsStepComponent },
      { path: 'review', component: ReviewStepComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class OnboardingRoutingModule { }
