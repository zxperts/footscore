import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient } from '@angular/common/http';
import { MatchService } from './app/match.service';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { environment } from './environments/environment';

// Initialize Firebase
const app = initializeApp(environment.firebaseConfig);
const db = getFirestore(app);

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
