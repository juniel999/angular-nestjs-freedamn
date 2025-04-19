import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AvatarUpdateService {
  private avatarUpdateSource = new Subject<string>();
  avatarUpdated$ = this.avatarUpdateSource.asObservable();

  updateAvatar(avatarUrl: string) {
    this.avatarUpdateSource.next(avatarUrl);
  }
}
