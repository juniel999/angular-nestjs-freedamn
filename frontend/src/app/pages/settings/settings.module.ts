import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { SettingsComponent } from './settings.component';
import { UserInfoComponent } from './user-info/user-info.component';
import { SocialsComponent } from './socials/socials.component';
import { TopicsTagsComponent } from './topics-tags/topics-tags.component';
import { AvatarCoverComponent } from './avatar-cover/avatar-cover.component';
import { AccountSettingsComponent } from './account-settings/account-settings.component';

const routes: Routes = [
  {
    path: '',
    component: SettingsComponent,
    children: [
      { path: '', redirectTo: 'user-info', pathMatch: 'full' },
      { path: 'user-info', component: UserInfoComponent },
      { path: 'socials', component: SocialsComponent },
      { path: 'topics-tags', component: TopicsTagsComponent },
      { path: 'avatar-cover', component: AvatarCoverComponent },
      { path: 'account', component: AccountSettingsComponent },
    ],
  },
];

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    FontAwesomeModule,

    SettingsComponent,
    UserInfoComponent,
    SocialsComponent,
    TopicsTagsComponent,
    AvatarCoverComponent,
    AccountSettingsComponent,
  ],
  exports: [RouterModule],
})
export class SettingsModule {}
