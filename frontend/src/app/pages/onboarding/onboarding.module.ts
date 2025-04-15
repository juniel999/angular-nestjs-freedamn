import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { OnboardingRoutingModule } from './onboarding-routing.module';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { ProfileStepComponent } from './onboarding/profile-step/profile-step.component';
import { AvatarStepComponent } from './onboarding/avatar-step/avatar-step.component';
import { TagsStepComponent } from './onboarding/tags-step/tags-step.component';
import { ReviewStepComponent } from './onboarding/review-step/review-step.component';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    OnboardingRoutingModule,
    OnboardingComponent,
    ProfileStepComponent,
    AvatarStepComponent,
    TagsStepComponent,
    ReviewStepComponent
  ]
})
export class OnboardingModule { }
