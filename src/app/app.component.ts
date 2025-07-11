import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Match, Buteur } from './models/match.model';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Team, TEAMS, ensureDefaultPlayer, Player } from './models/team.model';
import { FormsModule } from '@angular/forms';
import { PlayerSelectorComponent } from './player-selector/player-selector.component';
import { NavbarComponent } from './component/navbar/navbar.component';
import { FirestoreService } from './firestore.service';
import { RouterModule } from '@angular/router';
// Déplacer l'interface en dehors de la classe, au début du fichier
interface GroupedScorer {
  nom: string;
  minutes: number[];
  assist?: string;
}

interface TeamStats {
  name: string;
  points: number;
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    PlayerSelectorComponent, 
    NavbarComponent,
    RouterModule
  ],
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
  newPlayerName: string = '';
  showGoalCelebration: boolean = false;
  lastGoalScorer: string = '';
  lastGoalTeam: string = '';
  lastGoalAssist: string = '';
  showButeursList: boolean = true;  // Replié par défaut
  showDisposition: boolean = false;
  selectedPosition: { team: number, position: string } | null = null;
  showDispositionModal: boolean = false;  // Ajouter cette propriété
  showElements: boolean = true; // Par défaut, afficher les éléments
  showDefendersAndMidfielders: boolean = true; // Control visibility for modal
  showMatchEditForm: boolean = false; // Control visibility for match edit form
  matchEditForm: FormGroup; // Form for editing match details
  showScoreForm: boolean = false; // Control visibility for score form
  selectedTeamFilter: string = ''; // Property to hold the selected team for filtering
  showTeamFilterModal: boolean = false; // Control visibility for team filter modal
  selectedCompetitionFilter: string = ''; // Property to hold the selected competition for filtering
  showCompetitionFilterModal: boolean = false; // Control visibility for competition filter modal
  remainingDots: number = 5;
  private celebrationTimer: any;
  private usedColors: string[] = [];
  private static competitionColors = new Map<string, string>();
  showExportModal: boolean = false;
  exportFormats = {
    txt: false,
    csv: false,
    json: false
  };
  showHelpModal = false;
  showRankingModal = false;
  currentRanking: TeamStats[] = [];
  isSharingCompetition: boolean = false;
  isSharingMatch: boolean = false;
  sharingLogs: string[] = [];
  showEditPlayersModal: boolean = false;
  teamToEdit: Team | null = null;
  newPlayerType: 'attaquant' | 'milieu' | 'defenseur' = 'milieu';
  // newPlayerName déjà présente
  selectedPlayerGoalsIndex: number | null = null;
  selectedPlayerGoalsModal: Player | null = null;
  team1Search: string = '';
  team2Search: string = '';
  filteredTeams1: string[] = [];
  filteredTeams2: string[] = [];
  showNewTeamModal: boolean = false;
  newTeamName: string = '';
  newTeamPlayers: { name: string, type: 'attaquant' | 'milieu' | 'defenseur' }[] = [
    { name: '', type: 'milieu' }
  ];
  competitionSearch: string = '';
  filteredCompetitions: string[] = [];

  // Ajoute ces propriétés pour gérer les buts désactivés
  disabledGoals: { matchId: number, buteurIndex: number }[] = [];

  constructor(
    private fb: FormBuilder,
    private firestoreService: FirestoreService
  ) {
    this.matchForm = this.fb.group({
      equipe1: [this.teams[0].name, Validators.required],
      equipe2: ['', Validators.required],
      heureDebut: [this.getCurrentDateTime(), Validators.required],
      lieu: [''],
      competition: ['']
    });

    this.scoreForm = this.fb.group({
      score1: [0, [Validators.required, Validators.min(0)]],
      score2: [0, [Validators.required, Validators.min(0)]]
    });

    this.buteurForm = this.fb.group({
      nom: ['', Validators.required],
      minute: ['', [Validators.required, Validators.min(1), Validators.max(90)]],
      equipe: ['', Validators.required],
      assist: ['']
    });

    // Mettre à jour la liste des joueurs disponibles pour l'assist quand l'équipe change
    this.buteurForm.get('equipe')?.valueChanges.subscribe(equipe => {
      const assistControl = this.buteurForm.get('assist');
      if (assistControl) {
        assistControl.setValue('');
      }
    });

    this.matchEditForm = this.fb.group({
      equipe1: ['', Validators.required],
      equipe2: ['', Validators.required],
      heureDebut: ['', Validators.required],
      lieu: [''],
      competition: ['']
    });
  }

  async ngOnInit() {
    this.loadSavedData();
    this.startAutoSave();
    await this.loadMatchFromUrl();
    this.updateFilteredTeams1();
    this.updateFilteredTeams2();
  }

  getCurrentDateTime(): string {
    const now = new Date();
    // Ajuster pour le fuseau horaire local
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - timezoneOffset);
    return localNow.toISOString().slice(0, 16); // Format "YYYY-MM-DDThh:mm"
  }

  onSubmit() {
    console.log('onSubmit() appelée');
    console.log('matchForm valid:', this.matchForm.valid);
    console.log('matchForm value:', this.matchForm.value);
    
    if (this.matchForm.valid) {
      const matchStartTime = new Date(this.matchForm.value.heureDebut);
      const timezoneOffset = matchStartTime.getTimezoneOffset() * 60000;
      
      const newMatch: Match = {
        id: this.matches.length + 1,
        ...this.matchForm.value,
        //heureDebut: new Date(matchStartTime.getTime() - timezoneOffset), // Ajuster pour le fuseau horaire
        score1: 0,
        score2: 0,
        buteurs: [],
        showElements: true // Initialiser la visibilité
      };
      console.log('Nouveau match créé:', newMatch);
      this.matches.push(newMatch);
      console.log('matches après ajout:', this.matches);
      this.saveData();
      this.matchForm.reset({
        heureDebut: this.getCurrentDateTime()
      });
      this.showMatchForm = false;
      console.log('Match ajouté avec succès');
    } else {
      console.log('MatchForm invalide - soumission annulée');
    }
  }

  calculateElapsedMinutes(matchStartTime: Date): number {
    const now = new Date();
    const matchStart = new Date(matchStartTime);
    
    // Ajuster pour le fuseau horaire local
    //const timezoneOffset = matchStart.getTimezoneOffset() * 60000; // Convertir en millisecondes
    const localMatchStart = new Date(matchStart.getTime() );
    
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
    this.showScoreForm = true;
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
        players: [{ name: 'Joueur non listé', type: 'milieu' }]
      });
    }
    
    if (team2) {
      ensureDefaultPlayer(team2); // S'assurer qu'il y a au moins un joueur dans l'équipe 2
    } else {
      // Si team2 n'existe pas, créer une équipe avec "Joueur non listé"
      this.teams.push({
        id: this.teams.length + 1,
        name: match.equipe2,
        players: [{ name: 'Joueur non listé', type: 'milieu' }]
      });
    }

    // Mettre à jour la liste des joueurs si l'équipe 1 est U10
    if (match.equipe1 === 'U10 Stand. Flawinne FC') {
      const u10Team = this.teams.find(team => team.name === 'U10 Stand. Flawinne FC');
      this.selectedTeam = u10Team || null;
    }
    
    // Vérifier la cohérence au chargement du match
    this.maintainScoreConsistency();
  }

  updateScore() {
    console.log('updateScore() appelée');
    
    if (!this.selectedMatch) {
      console.log('selectedMatch null - mise à jour annulée');
      return;
    }
    
    console.log('Score avant mise à jour:', {
      score1: this.selectedMatch.score1,
      score2: this.selectedMatch.score2
    });
    
    this.selectedMatch.score1 = 0;
    this.selectedMatch.score2 = 0;
    this.selectedMatch.buteurs = [];
    
    console.log('Score après mise à jour:', {
      score1: this.selectedMatch.score1,
      score2: this.selectedMatch.score2,
      buteurs: this.selectedMatch.buteurs
    });
    
    this.saveData();
    console.log('Score mis à zéro avec succès');
  }

  modifierButeur(matchIndex: number, buteurIndex: number) {
    console.log('modifierButeur() appelée avec matchIndex:', matchIndex, 'buteurIndex:', buteurIndex);
    
    const match = this.matches[matchIndex];
    const buteur = match.buteurs[buteurIndex];
    
    console.log('Match trouvé:', match);
    console.log('Buteur à modifier:', buteur);
    
    // Si le but était désactivé, le réactiver
    if (this.isGoalDisabled(buteurIndex)) {
      this.disabledGoals = this.disabledGoals.filter(dg => 
        !(dg.matchId === match.id && dg.buteurIndex === buteurIndex)
      );
      console.log('But réactivé pour édition');
    }
    
    this.editingButeur = { index: buteurIndex, buteur: { ...buteur } };
    this.buteurForm.patchValue({
      nom: buteur.nom,
      minute: buteur.minute,
      equipe: buteur.equipe,
      assist: buteur.assist || ''
    });
    
    console.log('editingButeur défini:', this.editingButeur);
    this.showButeurForm = true;
  }

  ajouterButeur() {
    console.log('ajouterButeur() appelée');
    console.log('buteurForm valid:', this.buteurForm.valid);
    console.log('buteurForm value:', this.buteurForm.value);
    
    if (this.buteurForm.valid && this.selectedMatch) {
      const buteurData = this.buteurForm.value;
      console.log('Données du buteur:', buteurData);
      
      const newButeur: Buteur = {
        nom: buteurData.nom,
        minute: buteurData.minute,
        equipe: buteurData.equipe,
        assist: buteurData.assist || undefined
      };
      
      console.log('Nouveau buteur créé:', newButeur);
      
      if (this.editingButeur) {
        // Modification d'un buteur existant
        console.log('Modification du buteur existant');
        const matchIndex = this.matches.indexOf(this.selectedMatch);
        this.matches[matchIndex].buteurs[this.editingButeur.index] = newButeur;
        console.log('Buteur modifié dans le match');
        
        // Pas de mise à jour du score car on modifie un but existant
      } else {
        // Ajout d'un nouveau buteur
        console.log('Ajout d\'un nouveau buteur');
        this.selectedMatch.buteurs.push(newButeur);
        console.log('Buteur ajouté au match');
        
        // Mise à jour du score seulement pour les nouveaux buts
        if (newButeur.equipe === 1) {
          this.selectedMatch.score1++;
          console.log('Score équipe 1 incrémenté:', this.selectedMatch.score1);
        } else {
          this.selectedMatch.score2++;
          console.log('Score équipe 2 incrémenté:', this.selectedMatch.score2);
        }
      }
      
      console.log('Match après ajout/modification:', this.selectedMatch);
      
      // Maintenir la cohérence après modification
      this.maintainScoreConsistency();
      
      this.saveData();
      this.buteurForm.reset();
      this.showButeurForm = false;
      this.editingButeur = null;
      console.log('Buteur ajouté/modifié avec succès');
    } else {
      console.log('ButeurForm invalide ou selectedMatch null - ajout annulé');
    }
  }

  annulerEditionButeur() {
    console.log('annulerEditionButeur() appelée');
    this.buteurForm.reset();
    this.showButeurForm = false;
    this.editingButeur = null;
    console.log('Édition de buteur annulée');
  }

  supprimerButeur(matchIndex: number, buteurIndex: number) {
    console.log('supprimerButeur() appelée avec matchIndex:', matchIndex, 'buteurIndex:', buteurIndex);
    
    const match = this.matches[matchIndex];
    const buteur = match.buteurs[buteurIndex];
    
    console.log('Match:', match);
    console.log('Buteur à supprimer:', buteur);
    
    // Si le but était désactivé, le retirer de la liste des buts désactivés
    if (this.isGoalDisabled(buteurIndex)) {
      this.disabledGoals = this.disabledGoals.filter(dg => 
        !(dg.matchId === match.id && dg.buteurIndex === buteurIndex)
      );
      console.log('But désactivé retiré de la liste');
    }
    
    // Mise à jour du score
    if (buteur.equipe === 1) {
      match.score1 = Math.max(0, match.score1 - 1);
      console.log('Score équipe 1 décrémenté:', match.score1);
    } else {
      match.score2 = Math.max(0, match.score2 - 1);
      console.log('Score équipe 2 décrémenté:', match.score2);
    }
    
    match.buteurs.splice(buteurIndex, 1);
    console.log('Buteur supprimé du match');
    console.log('Match après suppression:', match);
    
    // Maintenir la cohérence après suppression
    this.maintainScoreConsistency();
    
    this.saveData();
    console.log('Buteur supprimé avec succès');
  }

  getPlayersList(): Player[] {
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
      const newTeam: Team = {
        id: this.teams.length + 1,
        name: newTeamName.trim(),
        players: []
      };
      
      this.teams.push(newTeam);
      selectElement.value = newTeam.name;

      // Update the form control based on which select element was used
      const formControl = selectElement.id === 'equipe1' ? 'equipe1' : 'equipe2';
      this.matchForm.get(formControl)?.setValue(newTeam.name);
    }
  }

  editNewTeam(selectElement: HTMLSelectElement) {
    const newTeamName = prompt('Entrez le nom de la nouvelle équipe:');
    if (newTeamName && newTeamName.trim()) {
      const newTeam: Team = {
        id: this.teams.length + 1,
        name: newTeamName.trim(),
        players: []
      };
      
      this.teams.push(newTeam);
      selectElement.value = newTeam.name;

      // Update the form control based on which select element was used
      const formControl = selectElement.id === 'equipe1' ? 'equipe1' : 'equipe2';
      this.matchEditForm.get(formControl)?.setValue(newTeam.name);
    }
  }

  addNewPlayer(playerName: string) {
    if (playerName && playerName.trim()) {
      const selectedTeam = this.teams.find(team => 
        team.name === (this.buteurForm.get('equipe')?.value === 1 ? 
          this.selectedMatch?.equipe1 : this.selectedMatch?.equipe2)
      );
      
      if (selectedTeam) {
        if (!selectedTeam.players.some(p => p.name === playerName.trim())) {
          selectedTeam.players.push({ name: playerName.trim(), type: 'milieu' });
        }
        this.buteurForm.get('nom')?.setValue(playerName.trim());
      }
    }
  }

  getTeamPlayers(teamNumber: number): Player[] {
    if (!this.selectedMatch) return [];
    
    const teamName = teamNumber === 1 ? this.selectedMatch.equipe1 : this.selectedMatch.equipe2;
    const team = this.teams.find(t => t.name === teamName);
    return team?.players || [];
  }

  quickAddGoal(playerName: string, teamNumber: 1 | 2) {
    console.log('quickAddGoal() appelée avec playerName:', playerName, 'teamNumber:', teamNumber);
    
    if (!this.selectedMatch) {
      console.log('selectedMatch null - ajout rapide annulé');
      return;
    }
    
    console.log('Match sélectionné:', this.selectedMatch);
    
    // Calculer la minute actuelle
    const elapsedMinutes = this.calculateElapsedMinutes(this.selectedMatch.heureDebut);
    console.log('Minutes écoulées:', elapsedMinutes);
    
    if (elapsedMinutes < 0) {
      console.log('Match pas encore commencé - ajout rapide annulé');
      return;
    }
    
    const newButeur: Buteur = {
      nom: playerName,
      minute: elapsedMinutes,
      equipe: teamNumber
    };
    
    console.log('Nouveau buteur rapide créé:', newButeur);
    
    this.selectedMatch.buteurs.push(newButeur);
    console.log('Buteur ajouté au match');
    
    // Mise à jour du score
    if (teamNumber === 1) {
      this.selectedMatch.score1++;
      console.log('Score équipe 1 incrémenté:', this.selectedMatch.score1);
    } else {
      this.selectedMatch.score2++;
      console.log('Score équipe 2 incrémenté:', this.selectedMatch.score2);
    }
    
    console.log('Match après ajout rapide:', this.selectedMatch);
    
    // Maintenir la cohérence après ajout rapide
    this.maintainScoreConsistency();
    
    this.saveData();
    
    // Célébration du but
    this.lastGoalScorer = playerName;
    this.lastGoalTeam = teamNumber === 1 ? this.selectedMatch.equipe1 : this.selectedMatch.equipe2;
    this.showGoalCelebration = true;
    this.remainingDots = 5;
    
    console.log('Célébration du but:', {
      scorer: this.lastGoalScorer,
      team: this.lastGoalTeam,
      showCelebration: this.showGoalCelebration
    });
    
    this.startCelebrationTimer();
    console.log('But ajouté rapidement avec succès');
  }

  saveGoalWithAssist() {
    console.log('saveGoalWithAssist() appelée');
    console.log('lastGoalScorer:', this.lastGoalScorer);
    console.log('lastGoalTeam:', this.lastGoalTeam);
    console.log('lastGoalAssist:', this.lastGoalAssist);
    
    if (!this.selectedMatch || !this.lastGoalScorer) {
      console.log('selectedMatch ou lastGoalScorer null - sauvegarde annulée');
      return;
    }
    
    // Trouver le dernier but ajouté et ajouter l'assist
    const lastButeur = this.selectedMatch.buteurs[this.selectedMatch.buteurs.length - 1];
    if (lastButeur && lastButeur.nom === this.lastGoalScorer) {
      lastButeur.assist = this.lastGoalAssist;
      console.log('Assist ajouté au buteur:', lastButeur);
    }
    
    this.saveData();
    //this.cancelGoal();
    this.showGoalCelebration = false;
    console.log('But avec assist sauvegardé avec succès');
  }

  cancelGoal() {
    console.log('cancelGoal() appelée');
    
    if (!this.selectedMatch) {
      console.log('selectedMatch null - annulation annulée');
      return;
    }
    
    // Supprimer le dernier but ajouté
    if (this.selectedMatch.buteurs.length > 0) {
      const lastButeur = this.selectedMatch.buteurs[this.selectedMatch.buteurs.length - 1];
      console.log('Dernier buteur à supprimer:', lastButeur);
      
      // Mettre à jour le score
      if (lastButeur.equipe === 1) {
        this.selectedMatch.score1 = Math.max(0, this.selectedMatch.score1 - 1);
        console.log('Score équipe 1 décrémenté:', this.selectedMatch.score1);
      } else {
        this.selectedMatch.score2 = Math.max(0, this.selectedMatch.score2 - 1);
        console.log('Score équipe 2 décrémenté:', this.selectedMatch.score2);
      }
      
      this.selectedMatch.buteurs.pop();
      console.log('Dernier buteur supprimé');
    }
    
    this.showGoalCelebration = false;
    this.lastGoalScorer = '';
    this.lastGoalTeam = '';
    this.lastGoalAssist = '';
    
    console.log('But annulé avec succès');
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
        if (data.teams) {
          this.teams = data.teams;
        }
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
      teams: this.teams,
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
          // Mettre à jour l'assist si présent
          if (buteur.assist) {
            existingScorer.assist = buteur.assist;
          }
        } else {
          acc.push({ 
            nom: buteur.nom, 
            minutes: [buteur.minute],
            assist: buteur.assist 
          });
        }
        return acc;
      }, [] as GroupedScorer[]);

    // Trier les buteurs par leur premier but
    return groupedScorers.sort((a, b) => a.minutes[0] - b.minutes[0]);
  }

  // Nouvelle méthode qui filtre les buts désactivés
  getActiveGroupedScorers(match: Match, equipe: 1 | 2): GroupedScorer[] {
    console.log(`getActiveGroupedScorers() pour équipe ${equipe}, match ${match.id}`);
    console.log('disabledGoals:', this.disabledGoals);
    
    // Regrouper les buteurs actifs par nom (en excluant les désactivés)
    const groupedScorers = match.buteurs
      .map((b, index) => ({ buteur: b, index }))
      .filter(item => 
        item.buteur.equipe === equipe && 
        !this.isGoalDisabledForMatch(match, item.index)
      )
      .reduce((acc, item) => {
        const existingScorer = acc.find(s => s.nom === item.buteur.nom);
        if (existingScorer) {
          existingScorer.minutes.push(item.buteur.minute);
          // Trier les minutes dans l'ordre croissant
          existingScorer.minutes.sort((a, b) => a - b);
          // Mettre à jour l'assist si présent
          if (item.buteur.assist) {
            existingScorer.assist = item.buteur.assist;
          }
        } else {
          acc.push({ 
            nom: item.buteur.nom, 
            minutes: [item.buteur.minute],
            assist: item.buteur.assist 
          });
        }
        return acc;
      }, [] as GroupedScorer[]);

    console.log(`Buts actifs trouvés pour équipe ${equipe}:`, groupedScorers);
    // Trier les buteurs par leur premier but
    return groupedScorers.sort((a, b) => a.minutes[0] - b.minutes[0]);
  }

  // Méthode pour obtenir les buts désactivés groupés
  getDisabledGroupedScorers(match: Match, equipe: 1 | 2): GroupedScorer[] {
    console.log(`getDisabledGroupedScorers() pour équipe ${equipe}, match ${match.id}`);
    
    // Regrouper les buteurs désactivés par nom (excluant "Joueur non listé")
    const groupedScorers = match.buteurs
      .map((b, index) => ({ buteur: b, index }))
      .filter(item => 
        item.buteur.equipe === equipe && 
        this.isGoalDisabledForMatch(match, item.index) &&
        item.buteur.nom !== 'Joueur non listé' // Exclure les "Joueur non listé" désactivés
      )
      .reduce((acc, item) => {
        const existingScorer = acc.find(s => s.nom === item.buteur.nom);
        if (existingScorer) {
          existingScorer.minutes.push(item.buteur.minute);
          // Trier les minutes dans l'ordre croissant
          existingScorer.minutes.sort((a, b) => a - b);
          // Mettre à jour l'assist si présent
          if (item.buteur.assist) {
            existingScorer.assist = item.buteur.assist;
          }
        } else {
          acc.push({ 
            nom: item.buteur.nom, 
            minutes: [item.buteur.minute], 
            assist: item.buteur.assist 
          });
        }
        return acc;
      }, [] as GroupedScorer[]);

    console.log(`Buts désactivés trouvés pour équipe ${equipe}:`, groupedScorers);
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

  getPlayerForPosition(team: number, position: string): Player | null {
    if (this.selectedMatch?.positions) {
      const key = `${team}_${position}`;
      const playerName = this.selectedMatch.positions[key];
      if (playerName) {
        return this.getPlayerByName(team, playerName);
      }
    }
    return null;
  }

  getPlayerByName(team: number, name: string): Player | null {
    const teamObj = this.teams.find(t => t.name === (team === 1 ? this.selectedMatch?.equipe1 : this.selectedMatch?.equipe2));
    if (!teamObj) return null;
    return teamObj.players.find(p => p.name === name) || null;
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

  toggleDefendersAndMidfielders() {
    this.showDefendersAndMidfielders = !this.showDefendersAndMidfielders;
  }

  toggleMatchEditForm(match: Match) {
    this.selectedMatch = match;
    this.matchEditForm.patchValue({
      equipe1: match.equipe1,
      equipe2: match.equipe2,
      heureDebut: this.getNearestValidTime(match.heureDebut),
      lieu: match.lieu,
      competition: match.competition
    });
    this.showMatchEditForm = !this.showMatchEditForm;
  }

  private getNearestValidTime(date: Date): string {
    const d = new Date(date);
    const minutes = d.getMinutes();
    if (minutes < 30) {
      d.setMinutes(0);
    } else {
      d.setMinutes(30);
    }
    return d.toISOString().slice(0, 16);
  }

  onSubmitMatchEdit() {
    if (this.matchEditForm.valid && this.selectedMatch) {
      const updatedMatch = this.matchEditForm.value;
      this.selectedMatch.equipe1 = updatedMatch.equipe1;
      this.selectedMatch.equipe2 = updatedMatch.equipe2;
      this.selectedMatch.heureDebut = new Date(updatedMatch.heureDebut);
      this.selectedMatch.lieu = updatedMatch.lieu;
      this.selectedMatch.competition = updatedMatch.competition;
      this.saveData();
      this.showMatchEditForm = false;
    }
  }

  // Method to filter matches based on the selected team
  get filteredMatches(): Match[] {
    return this.matches.filter(match => {
      const teamFilter = !this.selectedTeamFilter || 
                        match.equipe1 === this.selectedTeamFilter || 
                        match.equipe2 === this.selectedTeamFilter;
      const competitionFilter = !this.selectedCompetitionFilter || 
                              match.competition === this.selectedCompetitionFilter;
      return teamFilter && competitionFilter;
    });
  }

  // Method to close the team filter modal
  closeTeamFilterModal() {
    this.showTeamFilterModal = false;
  }

  async shareMatch(match: Match) {
    this.isSharingMatch = true;
    try {
      // Sauvegarder le match dans Firestore
      const matchId = await this.firestoreService.saveMatch(match);
      
      // Construire l'URL avec l'ID Firestore
      const matchUrl = `${window.location.origin}?matchId=${matchId}`;
      
      const matchInfo = `
Match : ${match.equipe1} vs ${match.equipe2}
Score : ${match.score1} - ${match.score2}
Date : ${match.heureDebut.toLocaleString('fr-FR', { 
  weekday: 'long', 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
Lieu : ${match.lieu || 'Non spécifié'}
Compétition : ${match.competition || 'Non spécifiée'}

Buteurs :
${match.equipe1}:
${this.getGroupedScorers(match, 1).map(b => `- ${b.nom}: ${b.minutes.join(', ')}'${b.assist ? ` (Assist: ${b.assist})` : ''}`).join('\n')}

${match.equipe2}:
${this.getGroupedScorers(match, 2).map(b => `- ${b.nom}: ${b.minutes.join(', ')}'${b.assist ? ` (Assist: ${b.assist})` : ''}`).join('\n')}

Lien direct vers le match : ${matchUrl}
      `.trim();

      if (navigator.share) {
        await navigator.share({
          title: `${match.equipe1} vs ${match.equipe2}`,
          text: matchInfo,
          url: matchUrl
        });
      } else {
        // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
        const textArea = document.createElement('textarea');
        textArea.value = matchInfo;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert('Informations du match copiées dans le presse-papiers !');
        } catch (err) {
          console.error('Erreur lors de la copie:', err);
        }
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde ou du partage du match:', error);
      alert('Une erreur est survenue lors de la sauvegarde ou du partage du match.');
    } finally {
      this.isSharingMatch = false;
    }
  }

  private async loadMatchFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const competitionId = urlParams.get('competitionId');
    const matchId = urlParams.get('matchId');
    
    if (competitionId) {
      try {
        const competition = await this.firestoreService.getCompetitionById(competitionId);
        if (competition) {
          const matches = await this.firestoreService.getMatchesByCompetition(competitionId);
          if (matches.length > 0) {
            this.matches = matches;
            this.selectedCompetitionFilter = competition.name;
            this.saveData();
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement de la compétition:', error);
      }
    } else if (matchId) {
      try {
        const match = await this.firestoreService.getMatchById(matchId);
        if (match) {
          // Convertir la date string en Date object
          match.heureDebut = new Date(match.heureDebut);
          
          // Vérifier si le match existe déjà dans matches
          const existingMatchIndex = this.matches.findIndex(m => m.id === match.id);
          if (existingMatchIndex === -1) {
            // Ajouter le match à la liste s'il n'existe pas déjà
            this.matches.push(match);
            // Sauvegarder les données
            this.saveData();
          }
          
          this.selectMatch(match);
          // Scroll to the match
          setTimeout(() => {
            const matchElement = document.querySelector(`[data-match-id="${match.id}"]`);
            if (matchElement) {
              matchElement.scrollIntoView({ behavior: 'smooth' });
            }
          }, 100);
        } else {
          console.error('Match non trouvé dans Firestore');
        }
      } catch (error) {
        console.error('Erreur lors du chargement du match depuis Firestore:', error);
      }
    }
  }

  // Mettre à jour l'affichage des buteurs dans la liste
  getButeurDisplay(buteur: Buteur): string {
    let display = `⚽ ${buteur.nom} (${buteur.minute}')`;
    if (buteur.assist) {
      display += ` (Assist: ${buteur.assist})`;
    }
    return display;
  }

  async saveMatchToFirestore(match: Match) {
    try {
      const matchId = await this.firestoreService.saveMatch(match);
      console.log('Match enregistré avec succès dans Firestore. ID:', matchId);
      // Rediriger vers la page de détail du match
      window.location.href = `/match/${matchId}`;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du match dans Firestore:', error);
    }
  }

  closeCompetitionFilterModal() {
    this.showCompetitionFilterModal = false;
  }

  get uniqueCompetitions(): string[] {
    const competitions = this.matches
      .map(match => match.competition)
      .filter((competition): competition is string => 
        competition !== undefined && competition !== '');
    return [...new Set(competitions)];
  }

  getCompetitionBadgeColor(competition: string): string {
    // Liste de classes de couleurs pastelles
    const colors = [
      'badge-pastel-primary',
      'badge-pastel-secondary',
      'badge-pastel-success',
      'badge-pastel-danger',
      'badge-pastel-warning',
      'badge-pastel-info',
      'badge-pastel-dark',
      'badge-pastel-purple',
      'badge-pastel-pink',
      'badge-pastel-teal'
    ];
    
    // Si la compétition a déjà une couleur assignée, la retourner
    if (AppComponent.competitionColors.has(competition)) {
      return AppComponent.competitionColors.get(competition)!;
    }
    
    // Générer un index basé sur le nom de la compétition
    const hash = competition.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Utiliser l'index pour sélectionner une couleur de manière cohérente
    const index = Math.abs(hash) % colors.length;
    const selectedColor = colors[index];
    
    // Stocker la couleur pour cette compétition
    AppComponent.competitionColors.set(competition, selectedColor);
    
    return selectedColor;
  }

  exportMatches() {
    this.showExportModal = true;
  }

  closeExportModal() {
    this.showExportModal = false;
    this.exportFormats = {
      txt: false,
      csv: false,
      json: false
    };
  }

  isExportFormatSelected(): boolean {
    return this.exportFormats.txt || this.exportFormats.csv || this.exportFormats.json;
  }

  async confirmExport() {
    if (this.exportFormats.txt) {
      const content = this.exportToTxt();
      this.downloadFile(content, 'matches.txt');
    }
    if (this.exportFormats.csv) {
      const content = this.exportToCsv();
      this.downloadFile(content, 'matches.csv');
    }
    if (this.exportFormats.json) {
      const content = this.exportToJson();
      this.downloadFile(content, 'matches.json');
    }
    this.closeExportModal();
  }

  private exportToTxt(): string {
    return this.matches.map(match => {
      const scorers1 = this.getGroupedScorers(match, 1);
      const scorers2 = this.getGroupedScorers(match, 2);
      
      return `
Match : ${match.equipe1} vs ${match.equipe2}
Score : ${match.score1} - ${match.score2}
Date : ${match.heureDebut.toLocaleString('fr-FR', { 
  weekday: 'long', 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}
Lieu : ${match.lieu || 'Non spécifié'}
Compétition : ${match.competition || 'Non spécifiée'}

Buteurs :
${match.equipe1}:
${scorers1.map(b => `- ${b.nom}: ${b.minutes.join(', ')}'${b.assist ? ` (Assist: ${b.assist})` : ''}`).join('\n')}

${match.equipe2}:
${scorers2.map(b => `- ${b.nom}: ${b.minutes.join(', ')}'${b.assist ? ` (Assist: ${b.assist})` : ''}`).join('\n')}
----------------------------------------
`.trim();
    }).join('\n\n');
  }

  private exportToCsv(): string {
    const headers = ['Équipe 1', 'Équipe 2', 'Score 1', 'Score 2', 'Date', 'Lieu', 'Compétition', 'Buteurs Équipe 1', 'Buteurs Équipe 2'];
    const rows = this.matches.map(match => {
      const scorers1 = this.getGroupedScorers(match, 1);
      const scorers2 = this.getGroupedScorers(match, 2);
      
      return [
        match.equipe1,
        match.equipe2,
        match.score1,
        match.score2,
        match.heureDebut.toLocaleString('fr-FR'),
        match.lieu || '',
        match.competition || '',
        scorers1.map(b => `${b.nom} (${b.minutes.join(', ')}'${b.assist ? `, Assist: ${b.assist}` : ''})`).join('; '),
        scorers2.map(b => `${b.nom} (${b.minutes.join(', ')}'${b.assist ? `, Assist: ${b.assist}` : ''})`).join('; ')
      ].map(field => `"${field}"`).join(',');
    });

    return [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  }

  private exportToJson(): string {
    return JSON.stringify(this.matches.map(match => ({
      ...match,
      heureDebut: match.heureDebut instanceof Date ? match.heureDebut.toISOString() : new Date().toISOString(),
      buteurs: match.buteurs.map(b => ({
        ...b,
        assist: b.assist || null
      }))
    })), null, 2);
  }

  private downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  importMatches() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.csv,.json';
    fileInput.onchange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const extension = file.name.split('.').pop()?.toLowerCase();
          
          try {
            let importedMatches: Match[] = [];
            
            switch (extension) {
              case 'txt':
                importedMatches = this.parseTxtImport(content);
                break;
              case 'csv':
                importedMatches = this.parseCsvImport(content);
                break;
              case 'json':
                importedMatches = this.parseJsonImport(content);
                break;
              default:
                throw new Error('Format de fichier non supporté');
            }
            
            if (importedMatches.length > 0) {
              if (confirm(`Voulez-vous importer ${importedMatches.length} match(s) ?`)) {
                this.matches.push(...importedMatches);
                this.saveData();
                alert('Import réussi !');
              }
            } else {
              alert('Aucun match trouvé dans le fichier.');
            }
          } catch (error) {
            console.error('Erreur lors de l\'import:', error);
            alert('Erreur lors de l\'import du fichier. Vérifiez le format.');
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  }

  private parseTxtImport(content: string): Match[] {
    const matches: Match[] = [];
    const matchBlocks = content.split('----------------------------------------');
    
    for (const block of matchBlocks) {
      if (!block.trim()) continue;
      
      const lines = block.trim().split('\n');
      const match: Partial<Match> = {
        id: this.matches.length + matches.length + 1,
        score1: 0,
        score2: 0,
        buteurs: []
      };
      
      for (const line of lines) {
        if (line.startsWith('Match : ')) {
          const teams = line.replace('Match : ', '').split(' vs ');
          match.equipe1 = teams[0].trim();
          match.equipe2 = teams[1].trim();
        } else if (line.startsWith('Score : ')) {
          const scores = line.replace('Score : ', '').split(' - ');
          match.score1 = parseInt(scores[0]);
          match.score2 = parseInt(scores[1]);
        } else if (line.startsWith('Date : ')) {
          match.heureDebut = new Date(line.replace('Date : ', ''));
        } else if (line.startsWith('Lieu : ')) {
          match.lieu = line.replace('Lieu : ', '').trim();
        } else if (line.startsWith('Compétition : ')) {
          match.competition = line.replace('Compétition : ', '').trim();
        } else if (line.includes(':')) {
          const [player, minutes] = line.split(':');
          const playerName = player.replace('-', '').trim();
          const minuteMatches = minutes.match(/\d+/g);
          const assistMatch = minutes.match(/\(Assist: (.*?)\)/);
          
          if (minuteMatches) {
            minuteMatches.forEach(minute => {
              match.buteurs?.push({
                nom: playerName,
                minute: parseInt(minute),
                equipe: line.includes(match.equipe1!) ? 1 : 2,
                assist: assistMatch ? assistMatch[1] : undefined
              });
            });
          }
        }
      }
      
      if (match.equipe1 && match.equipe2) {
        matches.push(match as Match);
      }
    }
    
    return matches;
  }

  private parseCsvImport(content: string): Match[] {
    const matches: Match[] = [];
    const lines = content.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const match: Partial<Match> = {
        id: this.matches.length + matches.length + 1,
        score1: 0,
        score2: 0,
        buteurs: []
      };
      
      headers.forEach((header, index) => {
        const value = values[index];
        switch (header) {
          case 'Équipe 1':
            match.equipe1 = value;
            break;
          case 'Équipe 2':
            match.equipe2 = value;
            break;
          case 'Score 1':
            match.score1 = parseInt(value);
            break;
          case 'Score 2':
            match.score2 = parseInt(value);
            break;
          case 'Date':
            match.heureDebut = new Date(value);
            break;
          case 'Lieu':
            match.lieu = value;
            break;
          case 'Compétition':
            match.competition = value;
            break;
          case 'Buteurs Équipe 1':
          case 'Buteurs Équipe 2':
            const team = header === 'Buteurs Équipe 1' ? 1 : 2;
            const scorers = value.split(';').map(s => s.trim());
            scorers.forEach(scorer => {
              const [name, rest] = scorer.split('(');
              const minutes = rest.match(/\d+/g);
              const assistMatch = rest.match(/Assist: (.*?)\)/);
              
              if (minutes) {
                minutes.forEach(minute => {
                  match.buteurs?.push({
                    nom: name.trim(),
                    minute: parseInt(minute),
                    equipe: team,
                    assist: assistMatch ? assistMatch[1] : undefined
                  });
                });
              }
            });
            break;
        }
      });
      
      if (match.equipe1 && match.equipe2) {
        matches.push(match as Match);
      }
    }
    
    return matches;
  }

  private parseJsonImport(content: string): Match[] {
    const data = JSON.parse(content);
    return Array.isArray(data) ? data.map((match: any, index: number) => ({
      ...match,
      id: this.matches.length + index + 1,
      heureDebut: match.heureDebut ? new Date(match.heureDebut) : new Date(),
      buteurs: match.buteurs || []
    })) : [];
  }

  getSortedMatches(): Match[] {
    return this.filteredMatches.slice().sort((a, b) => new Date(b.heureDebut).getTime() - new Date(a.heureDebut).getTime());
  }

  calculateRanking(competition: string): TeamStats[] {
    const teamStats = new Map<string, TeamStats>();
    
    // Filtrer les matchs de la compétition
    const competitionMatches = this.matches.filter(m => m.competition === competition);
    
    competitionMatches.forEach(match => {
      // Initialiser les stats pour les deux équipes si nécessaire
      [match.equipe1, match.equipe2].forEach(team => {
        if (!teamStats.has(team)) {
          teamStats.set(team, {
            name: team,
            points: 0,
            matches: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0
          });
        }
      });

      const team1Stats = teamStats.get(match.equipe1)!;
      const team2Stats = teamStats.get(match.equipe2)!;

      // Mettre à jour les statistiques
      team1Stats.matches++;
      team2Stats.matches++;
      team1Stats.goalsFor += match.score1;
      team1Stats.goalsAgainst += match.score2;
      team2Stats.goalsFor += match.score2;
      team2Stats.goalsAgainst += match.score1;

      if (match.score1 > match.score2) {
        team1Stats.wins++;
        team1Stats.points += 3;
        team2Stats.losses++;
      } else if (match.score1 < match.score2) {
        team2Stats.wins++;
        team2Stats.points += 3;
        team1Stats.losses++;
      } else {
        team1Stats.draws++;
        team2Stats.draws++;
        team1Stats.points += 1;
        team2Stats.points += 1;
      }
    });

    // Calculer la différence de buts
    teamStats.forEach(stats => {
      stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
    });

    // Convertir en tableau et trier
    return Array.from(teamStats.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });
  }

  showRanking() {
    if (this.selectedCompetitionFilter) {
      this.currentRanking = this.calculateRanking(this.selectedCompetitionFilter);
      this.showRankingModal = true;
    } else {
      alert('Veuillez sélectionner une compétition pour voir le classement');
    }
  }

  closeRankingModal() {
    this.showRankingModal = false;
  }

  async shareCompetition() {
    if (!this.selectedCompetitionFilter) {
      alert('Veuillez sélectionner une compétition');
      return;
    }

    this.isSharingCompetition = true;
    this.sharingLogs = ['Compétition en cours de sauvegarde...'];
    
    try {
      const competitionMatches = this.matches.filter(m => m.competition === this.selectedCompetitionFilter);
      if (competitionMatches.length === 0) {
        alert('Aucun match trouvé pour cette compétition');
        return;
      }

      // Sauvegarder la compétition dans Firestore
      const competitionId = await this.firestoreService.shareCompetition(
        this.selectedCompetitionFilter, 
        competitionMatches,
        (log) => {
          this.sharingLogs.push(log);
        }
      );

      // Construire le message de partage
      const competitionInfo = `
          Compétition : ${this.selectedCompetitionFilter}
          Nombre de matchs : ${competitionMatches.length}

          Matchs :
          ${competitionMatches.map(match => `
          ${match.equipe1} vs ${match.equipe2}
          Score : ${match.score1} - ${match.score2}
          Date : ${match.heureDebut.toLocaleString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
          Lieu : ${match.lieu || 'Non spécifié'}
          ----------------------------------------`).join('\n')}

          Lien vers la compétition : ${window.location.origin}?competitionId=${competitionId}
                `.trim();

      // Partager immédiatement après la création de la compétition
      if (navigator.share) {
        await navigator.share({
          title: `Compétition ${this.selectedCompetitionFilter}`,
          text: competitionInfo,
          url: `${window.location.origin}?competitionId=${competitionId}`
        });
      } else {
        // Fallback pour les navigateurs qui ne supportent pas l'API Web Share
        const textArea = document.createElement('textarea');
        textArea.value = competitionInfo;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          alert('Informations de la compétition copiées dans le presse-papiers !');
        } catch (err) {
          console.error('Erreur lors de la copie:', err);
        }
        document.body.removeChild(textArea);
      }

      // Continuer l'association des matchs en arrière-plan
      this.sharingLogs.push('Association des matchs en cours...');
      for (const match of competitionMatches) {
        const matchId = await this.firestoreService.saveMatch(match);
        this.sharingLogs.push(`Match ${match.equipe1} vs ${match.equipe2} sauvegardé`);
        await this.firestoreService.addMatchToCompetition(competitionId, matchId);
      }
      this.sharingLogs.push('Compétition sauvegardée avec succès !');

    } catch (error) {
      console.error('Erreur lors de la sauvegarde ou du partage de la compétition:', error);
      this.sharingLogs.push('Erreur lors de la sauvegarde de la compétition');
      alert('Une erreur est survenue lors de la sauvegarde ou du partage de la compétition.');
    } finally {
      this.isSharingCompetition = false;
    }
  }

  validateScore(score: number): number {
    const validatedScore = Math.max(0, score);
    console.log('validateScore() appelée avec:', score, 'retourne:', validatedScore);
    return validatedScore;
  }

  openEditPlayersModal(teamName: string) {
    const found = this.teams.find(t => t.name === teamName);
    if (found) {
      // On clone pour éviter la mutation directe avant validation
      this.teamToEdit = { ...found, players: [...found.players] };
      this.showEditPlayersModal = true;
    }
  }

  closeEditPlayersModal() {
    this.showEditPlayersModal = false;
    this.teamToEdit = null;
    this.newPlayerName = '';
  }

  addPlayer() {
    if (this.teamToEdit && this.newPlayerName.trim()) {
      this.teamToEdit.players.push({ name: this.newPlayerName.trim(), type: this.newPlayerType });
      this.newPlayerName = '';
      this.newPlayerType = 'milieu';
      this.saveData(); // Sauvegarder après ajout
    }
  }

  removePlayer(index: number) {
    if (this.teamToEdit) {
      this.teamToEdit.players.splice(index, 1);
      this.saveData(); // Sauvegarder après suppression
    }
  }

  savePlayersEdit() {
    this.saveData(); // Sauvegarder après édition
    this.closeEditPlayersModal();
  }

  // Retourne la liste des joueurs de teamToEdit triée par nombre de buts marqués (décroissant)
  getPlayersSortedByGoals(): Player[] {
    if (!this.teamToEdit) return [];
    // Compter les buts pour chaque joueur de l'équipe (tous matchs confondus)
    const goalCounts: { [player: string]: number } = {};
    for (const player of this.teamToEdit.players) {
      goalCounts[player.name] = 0;
      for (const match of this.matches) {
        // Vérifier si l'équipe correspond
        if (match.equipe1 === this.teamToEdit.name || match.equipe2 === this.teamToEdit.name) {
          for (const buteur of match.buteurs) {
            // Le buteur doit être dans l'équipe et avoir le même nom
            if (buteur.nom === player.name) {
              // Vérifier que le buteur est bien dans la bonne équipe (1 ou 2)
              const isTeam1 = match.equipe1 === this.teamToEdit.name && buteur.equipe === 1;
              const isTeam2 = match.equipe2 === this.teamToEdit.name && buteur.equipe === 2;
              if (isTeam1 || isTeam2) {
                goalCounts[player.name]++;
              }
            }
          }
        }
      }
    }
    // Retourner les joueurs triés par nombre de buts décroissant
    return [...this.teamToEdit.players].sort((a, b) => goalCounts[b.name] - goalCounts[a.name]);
  }

  // Retourne le nombre de buts marqués par un joueur pour l'équipe en cours d'édition
  getGoalsForPlayer(playerName: string): number {
    if (!this.teamToEdit) return 0;
    let count = 0;
    for (const match of this.matches) {
      if (match.equipe1 === this.teamToEdit.name || match.equipe2 === this.teamToEdit.name) {
        for (const buteur of match.buteurs) {
          if (buteur.nom === playerName) {
            const isTeam1 = match.equipe1 === this.teamToEdit.name && buteur.equipe === 1;
            const isTeam2 = match.equipe2 === this.teamToEdit.name && buteur.equipe === 2;
            if (isTeam1 || isTeam2) {
              count++;
            }
          }
        }
      }
    }
    return count;
  }

  cyclePlayerType(player: Player) {
    if (player.type === 'attaquant') player.type = 'milieu';
    else if (player.type === 'milieu') player.type = 'defenseur';
    else player.type = 'attaquant';
  }

  cycleNewPlayerType() {
    if (this.newPlayerType === 'attaquant') this.newPlayerType = 'milieu';
    else if (this.newPlayerType === 'milieu') this.newPlayerType = 'defenseur';
    else this.newPlayerType = 'attaquant';
  }

  getPlayerGoalsDetails(player: Player): { match: Match, minute: number }[] {
    const details: { match: Match, minute: number }[] = [];
    for (const match of this.matches) {
      if (match.equipe1 === this.teamToEdit?.name || match.equipe2 === this.teamToEdit?.name) {
        for (const buteur of match.buteurs) {
          if (buteur.nom === player.name) {
            details.push({ match, minute: buteur.minute });
          }
        }
      }
    }
    return details;
  }

  openPlayerGoalsModal(player: Player) {
    this.selectedPlayerGoalsModal = player;
  }

  closePlayerGoalsModal() {
    this.selectedPlayerGoalsModal = null;
  }

  updateFilteredTeams1() {
    const search = this.team1Search.toLowerCase();
    if (search.length < 3) {
      this.filteredTeams1 = [];
      return;
    }
    this.filteredTeams1 = TEAMS
      .map(t => t.name)
      .filter(name => name.toLowerCase().includes(search))
      .filter(name => name !== this.matchForm.value.equipe2);
  }

  updateFilteredTeams2() {
    const search = this.team2Search.toLowerCase();
    if (search.length < 3) {
      this.filteredTeams2 = [];
      return;
    }
    this.filteredTeams2 = TEAMS
      .map(t => t.name)
      .filter(name => name.toLowerCase().includes(search))
      .filter(name => name !== this.matchForm.value.equipe1);
  }

  selectTeam1(name: string) {
    this.matchForm.patchValue({ equipe1: name });
    this.team1Search = name;
    this.filteredTeams1 = [];
  }

  selectTeam2(name: string) {
    this.matchForm.patchValue({ equipe2: name });
    this.team2Search = name;
    this.filteredTeams2 = [];
  }

  openNewTeamModal() {
    this.showNewTeamModal = true;
    this.newTeamName = '';
    this.newTeamPlayers = [{ name: '', type: 'milieu' }];
  }

  closeNewTeamModal() {
    this.showNewTeamModal = false;
  }

  addNewTeamPlayer() {
    this.newTeamPlayers.push({ name: '', type: 'milieu' });
  }

  removeNewTeamPlayer(i: number) {
    if (this.newTeamPlayers.length > 1) {
      this.newTeamPlayers.splice(i, 1);
    }
  }

  createNewTeam() {
    if (!this.newTeamName.trim() || this.newTeamPlayers.every(p => !p.name.trim())) return;
    const newTeam = {
      id: Date.now(),
      name: this.newTeamName.trim(),
      players: this.newTeamPlayers.filter(p => p.name.trim())
    };
    this.teams.push(newTeam);
    this.saveData(); // Sauvegarder après création
    this.closeNewTeamModal();
  }

  canCreateNewTeam(): boolean {
    return !this.newTeamName.trim() || this.newTeamPlayers.every(p => !p.name.trim());
  }

  updateFilteredCompetitions() {
    const search = this.competitionSearch.toLowerCase();
    if (search.length < 3) {
      this.filteredCompetitions = [];
      return;
    }
    // Récupère toutes les compétitions uniques des matchs
    const competitions = Array.from(new Set(this.matches.map(m => m.competition).filter((c): c is string => !!c)));
    this.filteredCompetitions = competitions
      .filter(name => typeof name === 'string' && name.toLowerCase().includes(search));
  }

  selectCompetition(name: string) {
    this.matchForm.patchValue({ competition: name });
    this.competitionSearch = name;
    this.filteredCompetitions = [];
  }

  startCelebrationTimer() {
    console.log('startCelebrationTimer() appelée');
    this.celebrationTimer = setInterval(() => {
      this.remainingDots--;
      console.log('Dots restants:', this.remainingDots);
      if (this.remainingDots <= 0) {
        this.showGoalCelebration = false;
        clearInterval(this.celebrationTimer);
        console.log('Timer de célébration terminé');
        this.saveGoalWithAssist();
      }
    }, 1000);
  }

  // Méthode pour gérer la modification du score
  onScoreChange() {
    console.log('onScoreChange() appelée');
    
    if (!this.selectedMatch) {
      console.log('selectedMatch null - modification annulée');
      return;
    }
    
    const currentScore1 = this.selectedMatch.score1;
    const currentScore2 = this.selectedMatch.score2;
    
    console.log('Scores actuels:', { score1: currentScore1, score2: currentScore2 });
    
    // Calculer les buts actifs par équipe (sans les désactivés)
    const team1ActiveGoals = this.getActiveGoalsCount(1);
    const team2ActiveGoals = this.getActiveGoalsCount(2);
    
    console.log('Buts actifs:', { team1: team1ActiveGoals, team2: team2ActiveGoals });
    
    // Gérer équipe 1
    this.handleTeamScoreChange(1, currentScore1, team1ActiveGoals);
    
    // Gérer équipe 2
    this.handleTeamScoreChange(2, currentScore2, team2ActiveGoals);
    
    console.log('Match après modification:', this.selectedMatch);
    this.saveData();
  }

  handleTeamScoreChange(teamNumber: 1 | 2, newScore: number, currentGoals: number) {
    console.log(`handleTeamScoreChange() pour équipe ${teamNumber}:`, { newScore, currentGoals });
    
    const matchId = this.selectedMatch!.id;
    
    if (newScore > currentGoals) {
      // Score augmenté - d'abord réactiver les buts désactivés, puis ajouter si nécessaire
      const disabledTeamGoals = this.disabledGoals.filter(dg => 
        dg.matchId === matchId && 
        this.selectedMatch!.buteurs[dg.buteurIndex].equipe === teamNumber
      );
      
      console.log(`Buts désactivés pour équipe ${teamNumber}:`, disabledTeamGoals.length);
      
      // Réactiver d'abord tous les buts désactivés disponibles
      const goalsToReactivate = Math.min(newScore - currentGoals, disabledTeamGoals.length);
      console.log(`Réactivation de ${goalsToReactivate} buts désactivés`);
      
      for (let i = 0; i < goalsToReactivate; i++) {
        const disabledGoal = disabledTeamGoals[i];
        this.disabledGoals = this.disabledGoals.filter(dg => 
          !(dg.matchId === disabledGoal.matchId && dg.buteurIndex === disabledGoal.buteurIndex)
        );
        console.log(`But réactivé à l'index:`, disabledGoal.buteurIndex);
      }
      
      // Si il faut encore des buts après réactivation, ajouter des "Joueur non listé"
      const remainingGoalsNeeded = newScore - currentGoals - goalsToReactivate;
      if (remainingGoalsNeeded > 0) {
        console.log(`Ajout de ${remainingGoalsNeeded} buts "Joueur non listé"`);
        
        for (let i = 0; i < remainingGoalsNeeded; i++) {
          const newButeur: Buteur = {
            nom: 'Joueur non listé',
            minute: 1,
            equipe: teamNumber
          };
          this.selectedMatch!.buteurs.push(newButeur);
          console.log(`But ajouté:`, newButeur);
        }
      }
    } else if (newScore < currentGoals) {
      // Score diminué - désactiver les derniers buts (tous types de joueurs)
      const goalsToDisable = currentGoals - newScore;
      console.log(`Désactivation de ${goalsToDisable} buts de l'équipe ${teamNumber}`);
      
      // Trouver les derniers buts actifs de cette équipe (non désactivés)
      const activeTeamGoals = this.selectedMatch!.buteurs
        .map((b, index) => ({ buteur: b, index }))
        .filter(item => 
          item.buteur.equipe === teamNumber && 
          !this.isGoalDisabled(item.index)
        )
        .slice(-goalsToDisable);
      
      // Désactiver ces buts
      activeTeamGoals.forEach(item => {
        if (matchId !== undefined) {
          if (item.buteur.nom === 'Joueur non listé') {
            // Supprimer directement les "Joueur non listé" désactivés
            this.selectedMatch!.buteurs.splice(item.index, 1);
            console.log(`"Joueur non listé" supprimé:`, item.buteur);
          } else {
            // Désactiver les autres buts
            this.disabledGoals.push({ matchId, buteurIndex: item.index });
            console.log(`But désactivé:`, item.buteur);
          }
        }
      });
    }
  }

  // Méthode pour vérifier si un but est désactivé
  isGoalDisabled(buteurIndex: number): boolean {
    if (!this.selectedMatch) return false;
    
    return this.disabledGoals.some(dg => 
      dg.matchId === this.selectedMatch!.id && dg.buteurIndex === buteurIndex
    );
  }

  // Méthode pour vérifier si un but est désactivé pour un match spécifique
  isGoalDisabledForMatch(match: Match, buteurIndex: number): boolean {
    const isDisabled = this.disabledGoals.some(dg => 
      dg.matchId === match.id && dg.buteurIndex === buteurIndex
    );
    console.log(`isGoalDisabledForMatch(match ${match.id}, index ${buteurIndex}): ${isDisabled}`);
    return isDisabled;
  }

  // Méthode pour maintenir la cohérence entre score et buts actifs
  maintainScoreConsistency() {
    if (!this.selectedMatch) return;
    
    console.log('maintainScoreConsistency() appelée');
    
    const team1ActiveGoals = this.getActiveGoalsCount(1);
    const team2ActiveGoals = this.getActiveGoalsCount(2);
    
    console.log('Buts actifs actuels:', { team1: team1ActiveGoals, team2: team2ActiveGoals });
    console.log('Scores actuels:', { score1: this.selectedMatch.score1, score2: this.selectedMatch.score2 });
    
    // Vérifier et corriger l'équipe 1
    if (this.selectedMatch.score1 !== team1ActiveGoals) {
      console.log(`Incohérence équipe 1: score=${this.selectedMatch.score1}, buts actifs=${team1ActiveGoals}`);
      this.handleTeamScoreChange(1, this.selectedMatch.score1, team1ActiveGoals);
    }
    
    // Vérifier et corriger l'équipe 2
    if (this.selectedMatch.score2 !== team2ActiveGoals) {
      console.log(`Incohérence équipe 2: score=${this.selectedMatch.score2}, buts actifs=${team2ActiveGoals}`);
      this.handleTeamScoreChange(2, this.selectedMatch.score2, team2ActiveGoals);
    }
  }

  // Méthode pour obtenir le nombre de buts actifs par équipe
  getActiveGoalsCount(teamNumber: 1 | 2): number {
    if (!this.selectedMatch) return 0;
    
    return this.selectedMatch.buteurs.filter((b, index) => 
      b.equipe === teamNumber && !this.isGoalDisabled(index)
    ).length;
  }

  // Méthode pour obtenir le nombre de buts actifs par équipe pour un match spécifique
  getActiveGoalsCountForMatch(match: Match, teamNumber: 1 | 2): number {
    return match.buteurs.filter((b, index) => 
      b.equipe === teamNumber && !this.isGoalDisabledForMatch(match, index)
    ).length;
  }
}
