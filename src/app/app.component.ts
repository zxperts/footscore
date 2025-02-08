import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Match, Buteur } from './models/match.model';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Team, TEAMS, ensureDefaultPlayer } from './models/team.model';
import { FormsModule } from '@angular/forms';

// Déplacer l'interface en dehors de la classe, au début du fichier
interface GroupedScorer {
  nom: string;
  minutes: number[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  matchForm: FormGroup;
  scoreForm: FormGroup;
  buteurForm: FormGroup;
  matches: Match[] = [];
  selectedMatch: Match | null = null;
  showButeurForm = false;
  showMatchForm = false;
  editingButeur: { index: number, buteur: Buteur } | null = null;
  teams = TEAMS;
  selectedTeam: Team | null = null;
  newTeamName: string = '';
  newPlayerName: string = '';
  showGoalCelebration: boolean = false;
  lastGoalScorer: string = '';
  lastGoalTeam: string = '';
  showButeursList: boolean = false;  // Replié par défaut
  showDisposition: boolean = false;
  selectedPosition: { team: number, position: string } | null = null;
  showDispositionModal: boolean = false;  // Ajouter cette propriété
  showElements: boolean = true; // Par défaut, afficher les éléments

  constructor(private fb: FormBuilder) {
    this.matchForm = this.fb.group({
      equipe1: [this.teams[0].name, Validators.required],
      equipe2: ['', Validators.required],
      heureDebut: [this.getCurrentDateTime(), Validators.required],
      lieu: ['']
    });

    this.scoreForm = this.fb.group({
      score1: [0, [Validators.required, Validators.min(0)]],
      score2: [0, [Validators.required, Validators.min(0)]]
    });

    this.buteurForm = this.fb.group({
      nom: ['', Validators.required],
      minute: ['', [Validators.required, Validators.min(1), Validators.max(90)]],
      equipe: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadSavedData();
    this.startAutoSave();
  }

  getCurrentDateTime(): string {
    const now = new Date();
    // Ajuster pour le fuseau horaire local
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - timezoneOffset);
    return localNow.toISOString().slice(0, 16); // Format "YYYY-MM-DDThh:mm"
  }

  onSubmit() {
    if (this.matchForm.valid) {
      const matchStartTime = new Date(this.matchForm.value.heureDebut);
      const timezoneOffset = matchStartTime.getTimezoneOffset() * 60000;
      
      const newMatch: Match = {
        id: this.matches.length + 1,
        ...this.matchForm.value,
        heureDebut: new Date(matchStartTime.getTime() - timezoneOffset), // Ajuster pour le fuseau horaire
        score1: 0,
        score2: 0,
        buteurs: [],
        showElements: true // Initialiser la visibilité
      };
      this.matches.push(newMatch);
      this.saveData();
      this.matchForm.reset({
        heureDebut: this.getCurrentDateTime()
      });
      this.showMatchForm = false;
    }
  }

  calculateElapsedMinutes(matchStartTime: Date): number {
    const now = new Date();
    const matchStart = new Date(matchStartTime);
    
    // Ajuster pour le fuseau horaire local
    const timezoneOffset = matchStart.getTimezoneOffset() * 60000; // Convertir en millisecondes
    const localMatchStart = new Date(matchStart.getTime() + timezoneOffset);
    
    // Calculer la différence en minutes
    const diffInMinutes = Math.floor((now.getTime() - localMatchStart.getTime()) / (1000 * 60));
    console.log("diffInMinutes", diffInMinutes);
    console.log("now", now);
    console.log("localMatchStart", localMatchStart);
    
    // Si le match a commencé il y a plus de 90 minutes, retourner la dernière minute saisie
    if (diffInMinutes > 90) {
      return this.getLastScoredMinute() + 1;
    }
    
    // Sinon retourner les minutes écoulées (minimum 1)
    return Math.max(1, diffInMinutes);
  }

  // Nouvelle méthode pour obtenir la dernière minute de but
  private getLastScoredMinute(): number {
    if (!this.selectedMatch || this.selectedMatch.buteurs.length === 0) {
      return 0;
    }
    
    // Retourner la plus grande minute parmi tous les buts
    return Math.max(...this.selectedMatch.buteurs.map(b => b.minute));
  }

  selectMatch(match: Match) {
    this.selectedMatch = match;
    this.scoreForm.patchValue({
      score1: match.score1,
      score2: match.score2
    });
    
    const elapsedMinutes = this.calculateElapsedMinutes(match.heureDebut);
    
    // Ne plus initialiser showButeurForm à true
    this.showButeurForm = false;  // Masquer le formulaire par défaut
    this.buteurForm.patchValue({
      nom: '',
      minute: elapsedMinutes,
      equipe: 1
    });

    // Assurer qu'il y a au moins un joueur dans chaque équipe
    const team1 = this.teams.find(team => team.name === match.equipe1);
    const team2 = this.teams.find(team => team.name === match.equipe2);
    
    if (team1) {
      ensureDefaultPlayer(team1); // S'assurer qu'il y a au moins un joueur dans l'équipe 1
    } else {
      // Si team1 n'existe pas, créer une équipe avec "Joueur non listé"
      this.teams.push({
        id: this.teams.length + 1,
        name: match.equipe1,
        players: ['Joueur non listé']
      });
    }
    
    if (team2) {
      ensureDefaultPlayer(team2); // S'assurer qu'il y a au moins un joueur dans l'équipe 2
    } else {
      // Si team2 n'existe pas, créer une équipe avec "Joueur non listé"
      this.teams.push({
        id: this.teams.length + 1,
        name: match.equipe2,
        players: ['Joueur non listé']
      });
    }

    // Mettre à jour la liste des joueurs si l'équipe 1 est U10
    if (match.equipe1 === 'U10 Stand. Flawinne FC') {
      const u10Team = this.teams.find(team => team.name === 'U10 Stand. Flawinne FC');
      this.selectedTeam = u10Team || null;
    }
  }

  updateScore() {
    if (this.scoreForm.valid && this.selectedMatch) {
      const index = this.matches.findIndex(m => m.id === this.selectedMatch!.id);
      if (index !== -1) {
        this.matches[index] = {
          ...this.matches[index],
          score1: this.scoreForm.value.score1,
          score2: this.scoreForm.value.score2
        };
        this.selectedMatch = null;
        this.scoreForm.reset({ score1: 0, score2: 0 });
      }
    }
  }

  modifierButeur(matchIndex: number, buteurIndex: number) {
    const match = this.matches[matchIndex];
    const buteur = match.buteurs[buteurIndex];
    
    // Décrémenter le score de l'équipe correspondante
    if (buteur.equipe === 1) {
      match.score1--;  // Retirer le but de l'équipe 1
    } else {
      match.score2--;  // Retirer le but de l'équipe 2
    }
    
    this.editingButeur = { index: buteurIndex, buteur: { ...buteur } };
    this.buteurForm.patchValue({
      nom: buteur.nom,
      minute: buteur.minute,
      equipe: buteur.equipe
    });
    this.showButeurForm = true;
  }

  ajouterButeur() {
    if (this.buteurForm.valid && this.selectedMatch) {
      const buteur: Buteur = {
        nom: this.buteurForm.value.nom,
        minute: this.buteurForm.value.minute,
        equipe: this.buteurForm.value.equipe
      };

      const index = this.matches.findIndex(m => m.id === this.selectedMatch!.id);
      if (index !== -1) {
        if (this.editingButeur !== null) {
          // Mode modification
          this.matches[index].buteurs[this.editingButeur.index] = buteur;
        } else {
          // Mode ajout
          this.matches[index].buteurs.push(buteur);
        }
        
        // Mettre à jour le score
        if (buteur.equipe === 1) {
          this.matches[index].score1++;  // But pour l'équipe 1
          this.lastGoalTeam = this.selectedMatch.equipe1;
        } else {
          this.matches[index].score2++;  // But pour l'équipe 2
          this.lastGoalTeam = this.selectedMatch.equipe2;
        }
        
        // Déclencher la célébration
        this.lastGoalScorer = buteur.nom;
        this.showGoalCelebration = true;
        setTimeout(() => {
          this.showGoalCelebration = false;
        }, 3000);
        
        this.buteurForm.reset();
        this.editingButeur = null;
        this.showButeurForm = false;
        this.saveData();
      }
    }
  }

  annulerEditionButeur() {
    if (this.editingButeur && this.selectedMatch) {
      const index = this.matches.findIndex(m => m.id === this.selectedMatch!.id);
      if (index !== -1) {
        const buteur = this.editingButeur.buteur;
        if (buteur.equipe === 1) {
          this.matches[index].score1++;
        } else {
          this.matches[index].score2++;
        }
      }
    }
    this.editingButeur = null;
    this.buteurForm.reset();
    this.showButeurForm = false;
  }

  supprimerButeur(matchIndex: number, buteurIndex: number) {
    const match = this.matches[matchIndex];
    const buteur = match.buteurs[buteurIndex];
    
    // Décrémenter le score de l'équipe correspondante
    if (buteur.equipe === 1) {
      match.score1--;  // Retirer le but de l'équipe 1
    } else {
      match.score2--;  // Retirer le but de l'équipe 2
    }
    
    // Supprimer le buteur
    match.buteurs.splice(buteurIndex, 1);
    this.saveData();
  }

  getPlayersList(): string[] {
    if (this.selectedMatch && this.buteurForm.get('equipe')?.value) {
      const equipeValue = this.buteurForm.get('equipe')?.value;
      const equipeNom = equipeValue === 1 ? this.selectedMatch.equipe1 : this.selectedMatch.equipe2;
      
      // Vérifier spécifiquement si c'est l'équipe U10
      if (equipeNom === 'U10 Stand. Flawinne FC') {
        const u10Team = this.teams.find(team => team.name === 'U10 Stand. Flawinne FC');
        return u10Team?.players || [];
      }
    }
    return [];
  }

  addNewTeam(selectElement: HTMLSelectElement) {
    const newTeamName = prompt('Entrez le nom de la nouvelle équipe:');
    if (newTeamName && newTeamName.trim()) {
      const newTeam: Team = ensureDefaultPlayer({
        id: this.teams.length + 1,
        name: newTeamName.trim(),
        players: []
      });
      this.teams.push(newTeam);
      selectElement.value = newTeam.name;
      
      // Mettre à jour le formulaire
      const formControl = selectElement.id === 'equipe1' ? 'equipe1' : 'equipe2';
      this.matchForm.get(formControl)?.setValue(newTeam.name);
    }
  }

  addNewPlayer() {
    const newPlayerName = prompt('Entrez le nom du nouveau joueur:');
    if (newPlayerName && newPlayerName.trim()) {
      const selectedTeam = this.teams.find(team => 
        team.name === (this.buteurForm.get('equipe')?.value === 1 ? 
          this.selectedMatch?.equipe1 : this.selectedMatch?.equipe2)
      );
      
      if (selectedTeam) {
        selectedTeam.players.push(newPlayerName.trim());
        this.buteurForm.get('nom')?.setValue(newPlayerName.trim());
      }
    }
  }

  getTeamPlayers(teamNumber: number): string[] {
    if (!this.selectedMatch) return [];
    
    const teamName = teamNumber === 1 ? this.selectedMatch.equipe1 : this.selectedMatch.equipe2;
    const team = this.teams.find(t => t.name === teamName);
    return team?.players || [];
  }

  quickAddGoal(playerName: string, teamNumber: 1 | 2) {
    if (this.selectedMatch) {
      const elapsedMinutes = this.calculateElapsedMinutes(this.selectedMatch.heureDebut);
      const buteur: Buteur = {
        nom: playerName,
        minute: elapsedMinutes,
        equipe: teamNumber
      };

      const index = this.matches.findIndex(m => m.id === this.selectedMatch!.id);
      if (index !== -1) {
        // Ajouter le buteur
        this.matches[index].buteurs.push(buteur);
        
        // Mettre à jour le score
        if (teamNumber === 1) {
          this.matches[index].score1++;
          this.lastGoalTeam = this.selectedMatch.equipe1;
        } else {
          this.matches[index].score2++;
          this.lastGoalTeam = this.selectedMatch.equipe2;
        }
        this.saveData();
        
        // Déclencher la célébration
        this.lastGoalScorer = playerName;
        this.showGoalCelebration = true;
        setTimeout(() => {
          this.showGoalCelebration = false;
        }, 3000); // Disparaît après 3 secondes
      }
    }
  }

  supprimerMatch(match: Match) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
      const index = this.matches.findIndex(m => m.id === match.id);
      if (index !== -1) {
        this.matches.splice(index, 1);
        this.saveData();
      }
    }
  }

  // Charger les données sauvegardées
  private loadSavedData() {
    const savedData = localStorage.getItem('footballMatches');
    if (savedData) {
      const data = JSON.parse(savedData);
      const expirationDate = new Date(data.expirationDate);
      
      // Vérifier si les données n'ont pas expiré (3 mois)
      if (expirationDate > new Date()) {
        this.matches = data.matches.map((match: any) => ({
          ...match,
          heureDebut: new Date(match.heureDebut)
        }));
      } else {
        // Supprimer les données expirées
        localStorage.removeItem('footballMatches');
      }
    }
  }

  // Sauvegarder les données
  private saveData() {
    // Calculer la date d'expiration (3 mois à partir de maintenant)
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() + 3);

    const dataToSave = {
      matches: this.matches,
      expirationDate: expirationDate.toISOString()
    };

    localStorage.setItem('footballMatches', JSON.stringify(dataToSave));
  }

  // Configurer la sauvegarde automatique
  private startAutoSave() {
    // Sauvegarder toutes les 30 secondes
    setInterval(() => this.saveData(), 30000);
  }

  // Garder la méthode getGroupedScorers dans la classe
  getGroupedScorers(match: Match, equipe: 1 | 2): GroupedScorer[] {
    // Regrouper les buteurs par nom
    const groupedScorers = match.buteurs
      .filter(b => b.equipe === equipe)
      .reduce((acc, buteur) => {
        const existingScorer = acc.find(s => s.nom === buteur.nom);
        if (existingScorer) {
          existingScorer.minutes.push(buteur.minute);
          // Trier les minutes dans l'ordre croissant
          existingScorer.minutes.sort((a, b) => a - b);
        } else {
          acc.push({ nom: buteur.nom, minutes: [buteur.minute] });
        }
        return acc;
      }, [] as GroupedScorer[]);

    // Trier les buteurs par leur premier but
    return groupedScorers.sort((a, b) => a.minutes[0] - b.minutes[0]);
  }

  toggleButeursList() {
    this.showButeursList = !this.showButeursList;
  }

  toggleDispositionView() {
    this.showDisposition = !this.showDisposition;
  }

  selectPosition(team: number, position: string) {
    this.selectedPosition = { team, position };
  }

  assignPlayerToPosition(playerName: string) {
    if (this.selectedPosition && this.selectedMatch) {
      if (!this.selectedMatch.positions) {
        this.selectedMatch.positions = {};
      }
      const key = `${this.selectedPosition.team}_${this.selectedPosition.position}`;
      this.selectedMatch.positions[key] = playerName;
      this.selectedPosition = null;
      this.saveData();
    }
  }

  getPlayerForPosition(team: number, position: string): string {
    if (this.selectedMatch?.positions) {
      const key = `${team}_${position}`;
      return this.selectedMatch.positions[key] || '';
    }
    return '';
  }

  openDispositionModal(match: Match) {
    this.selectedMatch = match;
    this.showDispositionModal = true;
  }

  closeDispositionModal() {
    this.showDispositionModal = false;
    this.selectedMatch = null;
  }

  toggleVisibility(match: Match) {
    match.showElements = !match.showElements; // Inverser la visibilité pour le match concerné
  }
}
