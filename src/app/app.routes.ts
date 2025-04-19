import { Routes } from '@angular/router';
import { MatchDetailComponent } from './match-detail/match-detail.component';

export const routes: Routes = [
  { path: 'match/:id', component: MatchDetailComponent }
];
