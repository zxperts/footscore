import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FirestoreService } from '../firestore.service';
import { Match } from '../models/match.model';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="match-detail" *ngIf="match">
      <h2>{{ match.equipe1 }} vs {{ match.equipe2 }}</h2>
      <div class="match-info">
        <p>Date: {{ match.heureDebut | date:'medium' }}</p>
        <p>Lieu: {{ match.lieu }}</p>
        <p>Score: {{ match.score1 }} - {{ match.score2 }}</p>
      </div>
      
      <div class="buteurs">
        <h3>Buteurs</h3>
        <div *ngFor="let buteur of match.buteurs" class="buteur">
          <p>
            {{ buteur.nom }} ({{ buteur.minute }}')
            <span *ngIf="buteur.assist">(Assist: {{ buteur.assist }})</span>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .match-detail {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }
    .match-info {
      margin: 20px 0;
    }
    .buteurs {
      margin-top: 20px;
    }
    .buteur {
      margin: 10px 0;
    }
  `]
})
export class MatchDetailComponent implements OnInit {
  match: Match | null = null;

  constructor(
    private route: ActivatedRoute,
    private firestoreService: FirestoreService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const matchId = params['id'];
      if (matchId) {
        this.loadMatch(matchId);
      }
    });
  }

  private async loadMatch(matchId: string) {
    try {
      this.match = await this.firestoreService.getMatchById(matchId);
    } catch (error) {
      console.error('Erreur lors du chargement du match:', error);
    }
  }
} 