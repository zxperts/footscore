import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Match, Buteur, DuelGagne } from './models/match.model';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Team, TEAMS, ensureDefaultPlayer, Player } from './models/team.model';
import { FormsModule } from '@angular/forms';
import { PlayerSelectorComponent } from './player-selector/player-selector.component';
import { NavbarComponent } from './component/navbar/navbar.component';
import { FirestoreService } from './firestore.service';
import { RouterModule } from '@angular/router';
import { CompetitionFilterModalComponent, Competition, CompetitionUpdate } from './modals/competition-filter-modal/competition-filter-modal.component';
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
    RouterModule,
    CompetitionFilterModalComponent
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
  editingCompetitionName: string = ''; // Pour stocker l'ancien nom lors de l'édition
  newTeamName: string = '';
  newTeamPlayers: { name: string, type: 'attaquant' | 'milieu' | 'defenseur' }[] = [
    { name: '', type: 'milieu' }
  ];
  competitionSearch: string = '';
  filteredCompetitions: string[] = [];

  // Ajoute ces propriétés pour gérer les buts désactivés
  disabledGoals: { matchId: number, buteurIndex: number }[] = [];

  showingLocalStorageData = false;
  localStorageData: any = null;

  // Champs d'autocomplétion pour la modale d'édition de match
  editTeam1Search: string = '';
  editTeam2Search: string = '';
  editFilteredTeams1: string[] = [];
  editFilteredTeams2: string[] = [];
  editCompetitionSearch: string = '';
  editFilteredCompetitions: string[] = [];

  // === AUTOCOMPLETE BUTEUR & ASSIST ===
  buteurNameSearch: string = '';
  filteredButeurNames: string[] = [];
  assistSearch: string = '';
  filteredAssistNames: string[] = [];

  // === GESTION DES DUELS GAGNÉS ===
  showDuelCelebration: boolean = false;
  lastDuelWinner: string = '';
  lastDuelTeam: string = '';
  
  // Contrôles pour l'encodage dans la disposition tactique
  encodingGoalsEnabled: boolean = false;
  encodingDuelsEnabled: boolean = false;

  // Ajout d'un état pour savoir quel champ doit être rempli après création
  newTeamTargetField: 'equipe1' | 'equipe2' | null = null;

  selectedSeason: string = ''; // Sera initialisée dans ngOnInit avec la saison la plus récente

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
    this.selectedSeason = this.getCurrentSeason();
    
    // Initialiser le filtre de compétition avec la saison courante
    this.selectedCompetitionFilter = this.getCurrentSeason();
    
    // Créer les compétitions U10 et U11 si elles n'existent pas
    this.createU10U11CompetitionsIfNeeded();
  }

  // Méthode pour créer les compétitions U10 et U11 pour la saison 2025-2026
  private createU10U11CompetitionsIfNeeded() {
    // Vérifier si les compétitions existent déjà
    const existingCompetitions = this.matches
      .map(match => match.competition)
      .filter((comp): comp is string => comp !== undefined && comp !== '');
    
    const u10Exists = existingCompetitions.includes('Championnat U10');
    const u11Exists = existingCompetitions.includes('Championnat U11');
    
    // Si les deux compétitions existent déjà, ne rien faire
    if (u10Exists && u11Exists) {
      return;
    }
    
    // Créer les matchs temporaires pour les nouvelles compétitions
    const newMatches: Match[] = [];
    
    if (!u10Exists) {
      // Match pour Championnat U10 - 1er août 2025 (début de saison)
      const u10Match: Match = {
        id: this.matches.length + 1,
        equipe1: 'U10 Stand. Flawinne FC',
        equipe2: 'U10A Stand. Flawinne FC',
        score1: 0,
        score2: 0,
        buteurs: [],
        heureDebut: new Date(2025, 7, 1, 18, 0), // 1er août 2025 à 18h00
        lieu: 'Terrain Flawinne',
        positions: {},
        showElements: true,
        competition: 'Championnat U10',
        updatedAt: new Date(),
        duelsGagnes: []
      };
      newMatches.push(u10Match);
    }
    
    if (!u11Exists) {
      // Match pour Championnat U11 - 1er août 2025 (début de saison)
      const u11Match: Match = {
        id: this.matches.length + newMatches.length + 1,
        equipe1: 'U11B Stand. Flawinne FC',
        equipe2: 'U10 Stand. Flawinne FC',
        score1: 0,
        score2: 0,
        buteurs: [],
        heureDebut: new Date(2025, 7, 1, 19, 30), // 1er août 2025 à 19h30
        lieu: 'Terrain Flawinne',
        positions: {},
        showElements: true,
        competition: 'Championnat U11',
        updatedAt: new Date(),
        duelsGagnes: []
      };
      newMatches.push(u11Match);
    }
    
    // Ajouter les nouveaux matchs s'il y en a
    if (newMatches.length > 0) {
      this.matches.push(...newMatches);
      this.saveData();
      console.log(`Compétitions créées : ${newMatches.map(m => m.competition).join(', ')}`);
    }
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
        //heureDebut: new Date(matchStartTime.getTime() - timezoneOffset), // Ajuster pour le fuseau horaire
        score1: 0,
        score2: 0,
        buteurs: [],
        duelsGagnes: [], // Initialiser le tableau des duels gagnés
        showElements: true, // Initialiser la visibilité
        updatedAt: new Date()
      };
      console.log('Nouveau match créé:', newMatch);
      this.matches.push(newMatch);
      this.saveData();
      this.matchForm.reset({
        heureDebut: this.getCurrentDateTime()
      });
      this.showMatchForm = false;
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
    
    if (!this.selectedMatch) {
      console.log('selectedMatch null - mise à jour annulée');
      return;
    }
    
    this.selectedMatch.score1 = 0;
    this.selectedMatch.score2 = 0;
    this.selectedMatch.buteurs = [];
    
    console.log('Score après mise à jour:', {
      score1: this.selectedMatch.score1,
      score2: this.selectedMatch.score2,
      buteurs: this.selectedMatch.buteurs
    });
    
    this.saveData();
  }

  modifierButeur(matchIndex: number, buteurIndex: number) {    
    // Vérifications de sécurité
    if (matchIndex < 0 || matchIndex >= this.matches.length) {
      console.error('Index de match invalide:', matchIndex);
      return;
    }
    
    const match = this.matches[matchIndex];
    if (!match) {
      console.error('Match non trouvé à l\'index:', matchIndex);
      return;
    }
    
    if (!match.buteurs || !Array.isArray(match.buteurs)) {
      console.error('Propriété buteurs manquante ou invalide pour le match:', match);
      return;
    }
    
    if (buteurIndex < 0 || buteurIndex >= match.buteurs.length) {
      console.error('Index de buteur invalide:', buteurIndex, 'pour le match:', match);
      return;
    }
    
    const buteur = match.buteurs[buteurIndex];
    if (!buteur) {
      console.error('Buteur non trouvé à l\'index:', buteurIndex);
      return;
    }
    
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
    this.gererOuvertureFermetureButeurForm(true);
    
    this.showButeurForm = true;
  }

  ajouterButeur() {
    
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
        const matchIndex = this.matches.indexOf(this.selectedMatch);
        
        // Vérifications de sécurité pour la modification
        if (matchIndex < 0 || matchIndex >= this.matches.length) {
          console.error('Index de match invalide pour modification:', matchIndex);
          return;
        }
        
        const matchToUpdate = this.matches[matchIndex];
        if (!matchToUpdate || !matchToUpdate.buteurs || !Array.isArray(matchToUpdate.buteurs)) {
          console.error('Match ou propriété buteurs invalide pour modification:', matchToUpdate);
          return;
        }
        
        if (this.editingButeur.index < 0 || this.editingButeur.index >= matchToUpdate.buteurs.length) {
          console.error('Index de buteur invalide pour modification:', this.editingButeur.index);
          return;
        }
        
        matchToUpdate.buteurs[this.editingButeur.index] = newButeur;
        console.log('Buteur modifié dans le match');
        
        // Pas de mise à jour du score car on modifie un but existant
      } else {
        // Ajout d'un nouveau buteur
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
      this.gererOuvertureFermetureButeurForm(false);
    } else {
      console.log('ButeurForm invalide ou selectedMatch null - ajout annulé');
    }
  }

  annulerEditionButeur() {
    this.buteurForm.reset();
    this.showButeurForm = false;
    this.editingButeur = null;
    this.gererOuvertureFermetureButeurForm(false);
    console.log('Édition de buteur annulée');
  }

  supprimerButeur(matchIndex: number, buteurIndex: number) {
    // Vérifications de sécurité
    if (matchIndex < 0 || matchIndex >= this.matches.length) {
      console.error('Index de match invalide:', matchIndex);
      return;
    }
    
    const match = this.matches[matchIndex];
    if (!match) {
      console.error('Match non trouvé à l\'index:', matchIndex);
      return;
    }
    
    if (!match.buteurs || !Array.isArray(match.buteurs)) {
      console.error('Propriété buteurs manquante ou invalide pour le match:', match);
      return;
    }
    
    if (buteurIndex < 0 || buteurIndex >= match.buteurs.length) {
      console.error('Index de buteur invalide:', buteurIndex, 'pour le match:', match);
      return;
    }
    
    const buteur = match.buteurs[buteurIndex];
    if (!buteur) {
      console.error('Buteur non trouvé à l\'index:', buteurIndex);
      return;
    }
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le but de ${buteur.nom} à la minute ${buteur.minute} ?`)) {
      return;
    }
    
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

  quickAddDuel(playerName: string, teamNumber: 1 | 2) {
    console.log('quickAddDuel() appelée avec playerName:', playerName, 'teamNumber:', teamNumber);
    
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
    
    // Initialiser le tableau des duels gagnés s'il n'existe pas
    if (!this.selectedMatch.duelsGagnes) {
      this.selectedMatch.duelsGagnes = [];
    }
    
    const newDuel: DuelGagne = {
      nom: playerName,
      minute: elapsedMinutes,
      equipe: teamNumber
    };
    
    console.log('Nouveau duel gagné créé:', newDuel);
    
    this.selectedMatch.duelsGagnes.push(newDuel);
    console.log('Duel gagné ajouté au match');
    
    console.log('Match après ajout rapide:', this.selectedMatch);
    
    this.saveData();
    
    // Célébration du duel gagné
    this.lastDuelWinner = playerName;
    this.lastDuelTeam = teamNumber === 1 ? this.selectedMatch.equipe1 : this.selectedMatch.equipe2;
    this.showDuelCelebration = true;
    this.remainingDots = 5;
    
    console.log('Célébration du duel gagné:', {
      winner: this.lastDuelWinner,
      team: this.lastDuelTeam,
      showCelebration: this.showDuelCelebration
    });
    
    this.startCelebrationTimer();
    console.log('Duel gagné ajouté rapidement avec succès');
  }

  // Nouvelle méthode qui combine la logique de selectPosition et quickAddGoal/quickAddDuel
  quickAddAction(playerName: string, teamNumber: 1 | 2) {
    console.log('quickAddAction() appelée avec playerName:', playerName, 'teamNumber:', teamNumber);
    
    if (!this.selectedMatch) {
      console.log('selectedMatch null - action rapide annulée');
      return;
    }
    
    // Trouver le joueur pour déterminer son type
    const player = this.getPlayerByName(teamNumber, playerName);
    if (!player) {
      console.log('Joueur non trouvé - action rapide annulée');
      return;
    }
    
    console.log('Type du joueur:', player.type);
    
    // Déterminer si c'est un joueur défensif
    const isDefensivePlayer = player.type === 'defenseur';
    console.log('isDefensivePlayer:', isDefensivePlayer);
    
    if (isDefensivePlayer) {
      // Pour les défenseurs, enregistrer un duel gagné
      this.quickAddDuel(playerName, teamNumber);
    } else {
      // Pour les attaquants et milieux, enregistrer un but
      this.quickAddGoal(playerName, teamNumber);
    }
  }

  saveGoalWithAssist() {
    console.log('saveGoalWithAssist() appelée');
    
    if (!this.selectedMatch || !this.lastGoalScorer) {
      console.log('selectedMatch ou lastGoalScorer null - sauvegarde annulée');
      return;
    }
    
    // Vérifications de sécurité pour les buteurs
    if (!this.selectedMatch.buteurs || !Array.isArray(this.selectedMatch.buteurs) || this.selectedMatch.buteurs.length === 0) {
      console.error('Propriété buteurs invalide ou vide:', this.selectedMatch.buteurs);
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
    
    // Vérifications de sécurité pour les buteurs
    if (!this.selectedMatch.buteurs || !Array.isArray(this.selectedMatch.buteurs)) {
      console.error('Propriété buteurs invalide:', this.selectedMatch.buteurs);
      return;
    }
    
    // Supprimer le dernier but ajouté
    if (this.selectedMatch.buteurs.length > 0) {
      const lastButeur = this.selectedMatch.buteurs[this.selectedMatch.buteurs.length - 1];
      if (!lastButeur) {
        console.error('Dernier buteur non trouvé');
        return;
      }
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
    
  }

  saveDuel() {
    console.log('saveDuel() appelée');
    
    this.saveData();
    this.showDuelCelebration = false;
    this.lastDuelWinner = '';
    this.lastDuelTeam = '';
    
    console.log('Duel gagné sauvegardé avec succès');
  }

  cancelDuel() {
    console.log('cancelDuel() appelée');
    
    if (!this.selectedMatch) {
      console.log('selectedMatch null - annulation annulée');
      return;
    }
    
    // Supprimer le dernier duel ajouté
    if (this.selectedMatch.duelsGagnes && this.selectedMatch.duelsGagnes.length > 0) {
      const lastDuel = this.selectedMatch.duelsGagnes[this.selectedMatch.duelsGagnes.length - 1];
      console.log('Dernier duel à supprimer:', lastDuel);
      
      this.selectedMatch.duelsGagnes.pop();
      console.log('Dernier duel supprimé');
    }
    
    this.showDuelCelebration = false;
  }

  supprimerDuel(matchIndex: number, duelIndex: number) {
    console.log('supprimerDuel() appelée avec matchIndex:', matchIndex, 'duelIndex:', duelIndex);
    
    if (matchIndex < 0 || matchIndex >= this.matches.length) {
      console.log('Index de match invalide - suppression annulée');
      return;
    }
    
    const match = this.matches[matchIndex];
    
    if (!match.duelsGagnes || duelIndex < 0 || duelIndex >= match.duelsGagnes.length) {
      console.log('Index de duel invalide - suppression annulée');
      return;
    }
    
    console.log('Match:', match);
    console.log('Duel à supprimer:', match.duelsGagnes[duelIndex]);
    
    // Supprimer le duel
    match.duelsGagnes.splice(duelIndex, 1);
    console.log('Duel supprimé');
    
    this.saveData();
    console.log('Duel supprimé avec succès');
  }

  supprimerMatch(match: Match) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce match ?')) {
      return;
    }
    const matchIndex = this.matches.findIndex(m => m.id === match.id);
    if (matchIndex !== -1) {
      this.matches.splice(matchIndex, 1);
      this.saveData();
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
          heureDebut: new Date(match.heureDebut),
          duelsGagnes: match.duelsGagnes || [] // Initialiser les duels gagnés pour les anciens matchs
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

    // Trier par nom
    return groupedScorers.sort((a, b) => a.nom.localeCompare(b.nom));
  }

  getGroupedDuels(match: Match, equipe: 1 | 2): GroupedScorer[] {
    // Regrouper les duels gagnés par nom
    if (!match.duelsGagnes) {
      return [];
    }
    
    const groupedDuels = match.duelsGagnes
      .filter(d => d.equipe === equipe)
      .reduce((acc, duel) => {
        const existingDuel = acc.find(s => s.nom === duel.nom);
        if (existingDuel) {
          existingDuel.minutes.push(duel.minute);
          // Trier les minutes dans l'ordre croissant
          existingDuel.minutes.sort((a, b) => a - b);
        } else {
          acc.push({ 
            nom: duel.nom, 
            minutes: [duel.minute]
          });
        }
        return acc;
      }, [] as GroupedScorer[]);

    // Trier par nom
    return groupedDuels.sort((a, b) => a.nom.localeCompare(b.nom));
  }

  // Nouvelle méthode qui filtre les buts désactivés
  getActiveGroupedScorers(match: Match, equipe: 1 | 2): GroupedScorer[] {
    
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

    // Trier les buteurs par leur premier but
    return groupedScorers.sort((a, b) => a.minutes[0] - b.minutes[0]);
  }

  // Méthode pour obtenir les buts désactivés groupés
  getDisabledGroupedScorers(match: Match, equipe: 1 | 2): GroupedScorer[] {
    
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
    
    // Si un joueur est assigné à cette position, gérer l'action selon le type de joueur
    const player = this.getPlayerForPosition(team, position);
    if (player && this.selectedMatch) {
      // Déterminer si c'est une position défensive
      const isDefensivePosition = position.includes('defenseur') || position === 'gardien';
      console.log("isDefensivePosition"+isDefensivePosition);
      
      if (isDefensivePosition) {
        // Pour les défenseurs, enregistrer un duel gagné (si activé)
        if (this.encodingDuelsEnabled) {
          this.quickAddDuel(player.name, team as 1 | 2);
        }
      } else {
        // Pour les attaquants et milieux, enregistrer un but (si activé)
        if (this.encodingGoalsEnabled) {
          this.quickAddGoal(player.name, team as 1 | 2);
        }
      }
    }
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
    this.editTeam1Search = match.equipe1;
    this.editTeam2Search = match.equipe2;
    this.editCompetitionSearch = match.competition || '';
    this.editFilteredTeams1 = [];
    this.editFilteredTeams2 = [];
    this.editFilteredCompetitions = [];
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
      
      // Vérifier si selectedCompetitionFilter est une saison (format "YYYY-YYYY")
      const isSeason = this.selectedCompetitionFilter && this.selectedCompetitionFilter.includes('-');
      
      let competitionFilter = true;
      if (this.selectedCompetitionFilter) {
        if (isSeason) {
          // Si c'est une saison, filtrer par saison
          const matchSeason = this.getSeasonFromDate(match.heureDebut);
          competitionFilter = matchSeason === this.selectedCompetitionFilter;
        } else {
          // Si c'est une compétition spécifique, filtrer par compétition
          competitionFilter = match.competition === this.selectedCompetitionFilter;
        }
      }
      
      return teamFilter && competitionFilter;
    });
  }

  // Method to close the team filter modal
  closeTeamFilterModal() {
    this.showTeamFilterModal = false;
  }

  // Méthode pour obtenir les équipes filtrées selon le filtre de compétition
  get filteredTeamsForModal(): Team[] {
    if (!this.selectedCompetitionFilter) {
      return this.teams; // Si aucun filtre, retourner toutes les équipes
    }

    // Vérifier si selectedCompetitionFilter est une saison (format "YYYY-YYYY")
    const isSeason = this.selectedCompetitionFilter.includes('-');
    
    if (isSeason) {
      // Si c'est une saison, filtrer les équipes qui ont joué dans cette saison
      const teamsInSeason = new Set<string>();
      
      this.matches.forEach(match => {
        const matchSeason = this.getSeasonFromDate(match.heureDebut);
        if (matchSeason === this.selectedCompetitionFilter) {
          teamsInSeason.add(match.equipe1);
          teamsInSeason.add(match.equipe2);
        }
      });
      
      return this.teams.filter(team => teamsInSeason.has(team.name));
    } else {
      // Si c'est une compétition spécifique, filtrer les équipes qui ont joué dans cette compétition
      const teamsInCompetition = new Set<string>();
      
      this.matches.forEach(match => {
        if (match.competition === this.selectedCompetitionFilter) {
          teamsInCompetition.add(match.equipe1);
          teamsInCompetition.add(match.equipe2);
        }
      });
      
      return this.teams.filter(team => teamsInCompetition.has(team.name));
    }
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

Duels gagnés :
${match.equipe1}:
${this.getGroupedDuels(match, 1).map(d => `- ${d.nom}: ${d.minutes.join(', ')}'`).join('\n')}

${match.equipe2}:
${this.getGroupedDuels(match, 2).map(d => `- ${d.nom}: ${d.minutes.join(', ')}'`).join('\n')}

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
          let matchToSelect: Match;
          if (existingMatchIndex === -1) {
            // Ajouter le match à la liste s'il n'existe pas déjà
            console.log('Ajout du nouveau match à la liste');
            this.matches.push(match);
            // Sauvegarder les données
            this.saveData();
            matchToSelect = match;
          } else {
            // Afficher correctement l'ID du match existant
            const existingMatch = this.matches[existingMatchIndex];
            console.log('Match déjà existant dans la liste. ID:', existingMatch && existingMatch.id ? existingMatch.id : match.id);
            matchToSelect = existingMatch;
          }

          this.selectMatch(matchToSelect);
          // Scroll to the match
          this.selectedMatch = match;
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

  // Ouvrir la modale de gestion des compétitions avec la saison actuelle par défaut
  openCompetitionFilterModal() {
    this.selectedSeason = this.getCurrentSeason();
    this.showCompetitionFilterModal = true;
  }

  // Nouvelles méthodes pour la gestion des compétitions
  onSeasonChanged(season: string) {
    this.selectedSeason = season;
    // Mettre à jour le filtre de compétition avec la saison sélectionnée
    this.selectedCompetitionFilter = season;
  }

  onCompetitionSelected(competition: string) {
    this.selectedCompetitionFilter = competition;
    this.showCompetitionFilterModal = false;
  }

  async onCompetitionAdded(competition: Competition) {
    try {
      console.log('Ajout de la compétition:', competition);
      
      // Créer un match temporaire pour cette compétition
      const tempMatch: Match = {
        equipe1: 'Équipe temporaire',
        equipe2: 'Équipe temporaire',
        score1: 0,
        score2: 0,
        buteurs: [],
        heureDebut: new Date(),
        lieu: '',
        positions: {},
        showElements: true,
        competition: competition.name,
        updatedAt: new Date(),
        duelsGagnes: []
      };

      // Ajouter le match temporaire pour créer la compétition
      this.matches.push(tempMatch);
      
      // Sauvegarder les données
      this.saveData();
      
      // Fermer le modal
      this.showCompetitionFilterModal = false;
      
      // Afficher un message de succès
      alert(`Compétition "${competition.name}" ajoutée avec succès !`);
      
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la compétition:', error);
      alert('Erreur lors de l\'ajout de la compétition.');
    }
  }

  async onCompetitionUpdated(competitionUpdate: CompetitionUpdate) {
    try {
      console.log('Mise à jour de la compétition:', competitionUpdate);
      
      const { oldName, newCompetition } = competitionUpdate;
      
      if (oldName !== newCompetition.name) {
        // Mettre à jour le nom de la compétition dans tous les matchs
        this.matches.forEach(match => {
          if (match.competition === oldName) {
            match.competition = newCompetition.name;
            match.updatedAt = new Date();
          }
        });
        
        // Mettre à jour la sélection si nécessaire
        if (this.selectedCompetitionFilter === oldName) {
          this.selectedCompetitionFilter = newCompetition.name;
        }
        
        // Sauvegarder les données
        this.saveData();
        
        // Afficher un message de succès
        alert(`Compétition "${oldName}" mise à jour vers "${newCompetition.name}" avec succès !`);
      }
      
      // Fermer le modal
      this.showCompetitionFilterModal = false;
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la compétition:', error);
      alert('Erreur lors de la mise à jour de la compétition.');
    }
  }

  async onCompetitionDeleted(competition: string) {
    try {
      console.log('Suppression de la compétition:', competition);
      
      // Demander confirmation
      if (!confirm(`Êtes-vous sûr de vouloir supprimer la compétition "${competition}" ?\n\nCette action supprimera également tous les matchs associés.`)) {
        return;
      }
      
      // Supprimer tous les matchs de cette compétition
      this.matches = this.matches.filter(match => match.competition !== competition);
      
      // Mettre à jour la sélection si nécessaire
      if (this.selectedCompetitionFilter === competition) {
        this.selectedCompetitionFilter = '';
      }
      
      // Sauvegarder les données
      this.saveData();
      
      // Fermer le modal
      this.showCompetitionFilterModal = false;
      
      // Afficher un message de succès
      alert(`Compétition "${competition}" supprimée avec succès !`);
      
    } catch (error) {
      console.error('Erreur lors de la suppression de la compétition:', error);
      alert('Erreur lors de la suppression de la compétition.');
    }
  }

  // Attribuer une saison à une compétition
  async assignSeasonToCompetition(competition: string, season: string) {
    try {
      console.log(`Attribution de la saison ${season} à la compétition ${competition}`);
      
      // Trouver tous les matchs de cette compétition
      const competitionMatches = this.matches.filter(match => match.competition === competition);
      
      if (competitionMatches.length === 0) {
        alert(`Aucun match trouvé pour la compétition "${competition}"`);
        return;
      }
      
      // Calculer une nouvelle date pour chaque match basée sur la saison
      competitionMatches.forEach(match => {
        const [startYear] = season.split('-');
        const newDate = new Date(parseInt(startYear), 7, 1); // 1er août de l'année de début
        match.heureDebut = newDate;
        match.updatedAt = new Date();
      });
      
      // Sauvegarder les données
      this.saveData();
      
      // Afficher un message de succès
      alert(`Saison "${season}" attribuée à la compétition "${competition}" avec succès !`);
      
    } catch (error) {
      console.error('Erreur lors de l\'attribution de la saison:', error);
      alert('Une erreur est survenue lors de l\'attribution de la saison.');
    }
  }

  // Attribuer automatiquement la saison basée sur le premier match (sans modifier les dates)
  private assignSeasonAutomatically(competition: string, season: string) {
    try {
      console.log(`Attribution automatique de la saison ${season} à la compétition ${competition}`);
      
      // Trouver tous les matchs de cette compétition
      const competitionMatches = this.matches.filter(match => match.competition === competition);
      
      if (competitionMatches.length === 0) return;
      
      // Marquer les matchs comme appartenant à cette saison (sans changer les dates)
      // La saison sera calculée automatiquement via getSeasonFromDate()
      competitionMatches.forEach(match => {
        match.updatedAt = new Date();
      });
      
      // Sauvegarder les données
      this.saveData();
      
    } catch (error) {
      console.error('Erreur lors de l\'attribution automatique de la saison:', error);
    }
  }

  // Vérifier si une compétition n'a vraiment pas de saison
  isCompetitionWithoutSeason(competition: string): boolean {
    // Trouver tous les matchs de cette compétition
    const competitionMatches = this.matches.filter(match => match.competition === competition);
    
    if (competitionMatches.length === 0) return false;
    
    // Vérifier si tous les matchs n'ont pas de saison calculable
    const hasValidSeason = competitionMatches.some(match => {
      if (!match.heureDebut) return false;
      
      try {
        const season = this.getSeasonFromDate(match.heureDebut);
        return season && season !== '';
      } catch {
        return false;
      }
    });
    
    return !hasValidSeason;
  }

  // Obtenir la saison suggérée pour une compétition (basée sur le premier match)
  getSuggestedSeasonForCompetition(competition: string): string | null {
    // Trouver tous les matchs de cette compétition
    const competitionMatches = this.matches.filter(match => match.competition === competition);
    
    if (competitionMatches.length === 0) return null;
    
    // Trier par date pour trouver le premier match
    const sortedMatches = competitionMatches.sort((a, b) => {
      if (!a.heureDebut || !b.heureDebut) return 0;
      return a.heureDebut.getTime() - b.heureDebut.getTime();
    });
    
    const firstMatch = sortedMatches[0];
    if (!firstMatch.heureDebut) return null;
    
    try {
      return this.getSeasonFromDate(firstMatch.heureDebut);
    } catch {
      return null;
    }
  }

  // Gérer l'attribution de saison depuis le modal
  onAssignSeason(data: {competition: string, season: string}) {
    this.assignSeasonToCompetition(data.competition, data.season);
  }

  getCurrentSeason(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // getMonth() retourne 0-11
    
    // Si on est entre août (8) et décembre (12), c'est la saison année-année+1
    // Si on est entre janvier (1) et juillet (7), c'est la saison année-1-année
    if (month >= 8) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  getSeasonFromDate(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() retourne 0-11
    
    if (month >= 8) {
      return `${year}-${year + 1}`;
    } else {
      return `${year - 1}-${year}`;
    }
  }

  getCompetitionsBySeason(season: string): string[] {
    // Si aucune saison n'est spécifiée, utiliser la saison courante par défaut
    if (!season || season === '') {
      season = this.getCurrentSeason();
    }

    // Récupérer les compétitions de la saison sélectionnée
    const seasonCompetitions = this.matches
      .filter(match => {
        const matchSeason = this.getSeasonFromDate(match.heureDebut);
        return matchSeason === season;
      })
      .map(match => match.competition)
      .filter((competition): competition is string => 
        competition !== undefined && competition !== '');
    
    // Récupérer et attribuer automatiquement la saison aux compétitions sans saison
    const competitionsWithoutSeason = this.matches
      .filter(match => {
        if (!match.competition || match.competition === '') return false;
        
        // Vérifier si c'est le premier match de cette compétition
        const competitionMatches = this.matches.filter(m => m.competition === match.competition);
        const firstMatch = competitionMatches.reduce((earliest, current) => 
          current.heureDebut < earliest.heureDebut ? current : earliest
        );
        
        // Si c'est le premier match et qu'il appartient à la saison sélectionnée
        if (match.id === firstMatch.id && this.getSeasonFromDate(match.heureDebut) === season) {
          // Attribuer automatiquement la saison à cette compétition
          this.assignSeasonAutomatically(match.competition, season);
          return true;
        }
        return false;
      })
      .map(match => match.competition)
      .filter((competition): competition is string => 
        competition !== undefined && competition !== '');
    
    // Combiner et dédupliquer
    const allCompetitions = [...seasonCompetitions, ...competitionsWithoutSeason];
    return [...new Set(allCompetitions)];
  }

  getAvailableSeasons(): string[] {
    const seasons = this.matches
      .map(match => this.getSeasonFromDate(match.heureDebut))
      .filter((season, index, array) => array.indexOf(season) === index)
      .sort((a, b) => {
        const yearA = parseInt(a.split('-')[0]);
        const yearB = parseInt(b.split('-')[0]);
        return yearB - yearA; // Ordre décroissant (plus récent en premier)
      });
    return seasons;
  }

  get uniqueCompetitions(): string[] {
    return this.getCompetitionsBySeason(this.selectedSeason);
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

  getScoreColor(match: Match): string {
    // Vérifier si une des équipes contient "flawinne" (insensible à la casse)
    const hasFlawinneTeam = [match.equipe1, match.equipe2].some(teamName => 
      teamName.toLowerCase().includes('flawinne')
    );
    
    if (!hasFlawinneTeam) {
      return 'btn-light'; // Gris clair par défaut si pas d'équipe Flawinne
    }
    
    // Déterminer le résultat pour l'équipe Flawinne
    const flawinneTeam = match.equipe1.toLowerCase().includes('flawinne') ? match.equipe1 : match.equipe2;
    const flawinneScore = match.equipe1.toLowerCase().includes('flawinne') ? match.score1 : match.score2;
    const opponentScore = match.equipe1.toLowerCase().includes('flawinne') ? match.score2 : match.score1;
    
    if (flawinneScore > opponentScore) {
      return 'btn-score-success'; // Vert moderne si victoire
    } else if (flawinneScore < opponentScore) {
      return 'btn-score-danger'; // Rouge moderne si défaite
    } else {
      return 'btn-score-light'; // Gris moderne si match nul
    }
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
    let content = 'FOOTBALL MATCHES EXPORT\n';
    content += '========================\n\n';
    
    for (const match of this.getSortedMatches()) {
      content += `Match: ${match.equipe1} vs ${match.equipe2}\n`;
      content += `Score: ${match.score1} - ${match.score2}\n`;
      content += `Date: ${match.heureDebut.toLocaleString('fr-FR')}\n`;
      if (match.lieu) content += `Lieu: ${match.lieu}\n`;
      if (match.competition) content += `Compétition: ${match.competition}\n`;
      
      // Buteurs
      if (match.buteurs.length > 0) {
        content += '\nButeurs:\n';
        const groupedScorers1 = this.getGroupedScorers(match, 1);
        const groupedScorers2 = this.getGroupedScorers(match, 2);
        
        if (groupedScorers1.length > 0) {
          content += `${match.equipe1}:\n`;
          for (const scorer of groupedScorers1) {
            content += `  - ${scorer.nom}: ${scorer.minutes.join(', ')}'${scorer.assist ? ` (Assist: ${scorer.assist})` : ''}\n`;
          }
        }
        
        if (groupedScorers2.length > 0) {
          content += `${match.equipe2}:\n`;
          for (const scorer of groupedScorers2) {
            content += `  - ${scorer.nom}: ${scorer.minutes.join(', ')}'${scorer.assist ? ` (Assist: ${scorer.assist})` : ''}\n`;
          }
        }
      }
      
      // Duels gagnés
      if (match.duelsGagnes && match.duelsGagnes.length > 0) {
        content += '\nDuels gagnés:\n';
        const groupedDuels1 = this.getGroupedDuels(match, 1);
        const groupedDuels2 = this.getGroupedDuels(match, 2);
        
        if (groupedDuels1.length > 0) {
          content += `${match.equipe1}:\n`;
          for (const duel of groupedDuels1) {
            content += `  - ${duel.nom}: ${duel.minutes.join(', ')}'\n`;
          }
        }
        
        if (groupedDuels2.length > 0) {
          content += `${match.equipe2}:\n`;
          for (const duel of groupedDuels2) {
            content += `  - ${duel.nom}: ${duel.minutes.join(', ')}'\n`;
          }
        }
      }
      
      content += '\n' + '='.repeat(50) + '\n\n';
    }
    
    return content;
  }

  private exportToCsv(): string {
    let content = 'Équipe 1,Équipe 2,Score 1,Score 2,Date,Lieu,Compétition,Buteurs Équipe 1,Buteurs Équipe 2,Duels Équipe 1,Duels Équipe 2\n';
    
    for (const match of this.getSortedMatches()) {
      const scorers1 = this.getGroupedScorers(match, 1);
      const scorers2 = this.getGroupedScorers(match, 2);
      const duels1 = this.getGroupedDuels(match, 1);
      const duels2 = this.getGroupedDuels(match, 2);
      
      const scorers1Str = scorers1.map(s => `${s.nom}(${s.minutes.join(',')}')`).join('; ');
      const scorers2Str = scorers2.map(s => `${s.nom}(${s.minutes.join(',')}')`).join('; ');
      const duels1Str = duels1.map(d => `${d.nom}(${d.minutes.join(',')}')`).join('; ');
      const duels2Str = duels2.map(d => `${d.nom}(${d.minutes.join(',')}')`).join('; ');
      
      content += `"${match.equipe1}","${match.equipe2}",${match.score1},${match.score2},"${match.heureDebut.toLocaleString('fr-FR')}","${match.lieu || ''}","${match.competition || ''}","${scorers1Str}","${scorers2Str}","${duels1Str}","${duels2Str}"\n`;
    }
    
    return content;
  }

  private exportToJson(): string {
    const exportData = this.getSortedMatches().map(match => ({
      equipe1: match.equipe1,
      equipe2: match.equipe2,
      score1: match.score1,
      score2: match.score2,
      heureDebut: match.heureDebut.toISOString(),
      lieu: match.lieu,
      competition: match.competition,
      buteurs: match.buteurs,
      duelsGagnes: match.duelsGagnes || []
    }));
    
    return JSON.stringify(exportData, null, 2);
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
    const lines = content.trim().split('\n');
    if (lines.length < 2) throw new Error('Fichier CSV vide ou invalide');
    
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const matches: Match[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const values = this.parseCsvLine(line);
      
      if (values.length < 8) continue; // Minimum requis
      
      const match: Match = {
        id: this.matches.length + i,
        equipe1: values[0]?.replace(/"/g, '') || '',
        equipe2: values[1]?.replace(/"/g, '') || '',
        score1: parseInt(values[2]) || 0,
        score2: parseInt(values[3]) || 0,
        heureDebut: new Date(values[4] || new Date()),
        lieu: values[5]?.replace(/"/g, '') || '',
        competition: values[6]?.replace(/"/g, '') || '',
        buteurs: [],
        duelsGagnes: [],
        updatedAt: new Date()
      };
      
      // Parser les buteurs équipe 1
      if (values[7]) {
        const buteurs1Str = values[7].replace(/"/g, '');
        if (buteurs1Str) {
          const buteurs1 = this.parseScorersString(buteurs1Str, 1);
          match.buteurs.push(...buteurs1);
        }
      }
      
      // Parser les buteurs équipe 2
      if (values[8]) {
        const buteurs2Str = values[8].replace(/"/g, '');
        if (buteurs2Str) {
          const buteurs2 = this.parseScorersString(buteurs2Str, 2);
          match.buteurs.push(...buteurs2);
        }
      }
      
      // Parser les duels équipe 1
      if (values[9]) {
        const duels1Str = values[9].replace(/"/g, '');
        if (duels1Str) {
          const duels1 = this.parseDuelsString(duels1Str, 1);
          match.duelsGagnes.push(...duels1);
        }
      }
      
      // Parser les duels équipe 2
      if (values[10]) {
        const duels2Str = values[10].replace(/"/g, '');
        if (duels2Str) {
          const duels2 = this.parseDuelsString(duels2Str, 2);
          match.duelsGagnes.push(...duels2);
        }
      }
      
      matches.push(match);
    }
    
    return matches;
  }

  private parseJsonImport(content: string): Match[] {
    try {
      const data = JSON.parse(content);
      return data.map((match: any) => ({
        ...match,
        heureDebut: new Date(match.heureDebut),
        duelsGagnes: match.duelsGagnes || []
      }));
    } catch (error) {
      throw new Error('Format JSON invalide');
    }
  }

  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    values.push(current.trim());
    return values;
  }

  private parseScorersString(scorersStr: string, equipe: 1 | 2): Buteur[] {
    const buteurs: Buteur[] = [];
    const scorerEntries = scorersStr.split(';').map(s => s.trim()).filter(s => s);
    
    for (const entry of scorerEntries) {
      const match = entry.match(/(.+)\(([^)]+)\)/);
      if (match) {
        const nom = match[1].trim();
        const minutesStr = match[2];
        const minutes = minutesStr.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m));
        
        for (const minute of minutes) {
          buteurs.push({
            nom,
            minute,
            equipe
          });
        }
      }
    }
    
    return buteurs;
  }

  private parseDuelsString(duelsStr: string, equipe: 1 | 2): DuelGagne[] {
    const duels: DuelGagne[] = [];
    const duelEntries = duelsStr.split(';').map(s => s.trim()).filter(s => s);
    
    for (const entry of duelEntries) {
      const match = entry.match(/(.+)\(([^)]+)\)/);
      if (match) {
        const nom = match[1].trim();
        const minutesStr = match[2];
        const minutes = minutesStr.split(',').map(m => parseInt(m.trim())).filter(m => !isNaN(m));
        
        for (const minute of minutes) {
          duels.push({
            nom,
            minute,
            equipe
          });
        }
      }
    }
    
    return duels;
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
      const player = this.teamToEdit.players[index];
      if (!confirm(`Êtes-vous sûr de vouloir supprimer le joueur ${player.name} ?`)) {
        return;
      }
      this.teamToEdit.players.splice(index, 1);
      this.saveData(); // Sauvegarder après suppression
    }
  }

  savePlayersEdit() {
    if (this.teamToEdit) {
      // Remplacer l'équipe dans le tableau principal
      const idx = this.teams.findIndex(t => t.name === this.teamToEdit!.name);
      if (idx !== -1) {
        this.teams[idx] = { ...this.teamToEdit, players: [...this.teamToEdit.players] };
      }
    }
    this.saveData();
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
    const search = this.team1Search;
    // Mettre à jour la valeur du formulaire avec ce qui est tapé
    this.matchForm.patchValue({ equipe1: search });
    
    if (search.length < 3) {
      this.filteredTeams1 = [];
      return;
    }
    this.filteredTeams1 = this.teams
      .map(t => t.name)
      .filter(name => name.toLowerCase().includes(search.toLowerCase()))
      .filter(name => name !== this.matchForm.value.equipe2);
  }

  updateFilteredTeams2() {
    const search = this.team2Search;
    // Mettre à jour la valeur du formulaire avec ce qui est tapé
    this.matchForm.patchValue({ equipe2: search });
    
    if (search.length < 3) {
      this.filteredTeams2 = [];
      return;
    }
    this.filteredTeams2 = this.teams
      .map(t => t.name)
      .filter(name => name.toLowerCase().includes(search.toLowerCase()))
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

  openNewTeamModalFor(field: 'equipe1' | 'equipe2') {
    this.newTeamTargetField = field;
    this.showNewTeamModal = true;
    this.newTeamName = field === 'equipe1' ? this.team1Search : this.team2Search;
    this.newTeamPlayers = [{ name: '', type: 'milieu' }];
  }

  createNewTeam() {
    if (!this.newTeamName.trim() || this.newTeamPlayers.every(p => !p.name.trim())) return;
    const newTeam = {
      id: Date.now(),
      name: this.newTeamName.trim(),
      players: this.newTeamPlayers.filter(p => p.name.trim())
    };
    this.teams.push(newTeam);
    this.saveData();
    // Remplir le champ concerné
    if (this.newTeamTargetField === 'equipe1') {
      this.matchForm.patchValue({ equipe1: newTeam.name });
      this.team1Search = newTeam.name;
    } else if (this.newTeamTargetField === 'equipe2') {
      this.matchForm.patchValue({ equipe2: newTeam.name });
      this.team2Search = newTeam.name;
    }
    this.closeNewTeamModal();
    this.newTeamTargetField = null;
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
        // Gérer la fin de célébration selon le type
        if (this.showGoalCelebration) {
          this.showGoalCelebration = false;
          this.saveGoalWithAssist();
        } else if (this.showDuelCelebration) {
          this.showDuelCelebration = false;
          this.saveDuel();
        }
        clearInterval(this.celebrationTimer);
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
      const disabledTeamGoals = this.disabledGoals.filter(dg => {
        // Vérifications de sécurité pour l'accès aux buteurs
        if (!this.selectedMatch || !this.selectedMatch.buteurs || !Array.isArray(this.selectedMatch.buteurs)) {
          console.error('selectedMatch ou buteurs invalide dans handleTeamScoreChange');
          return false;
        }
        
        if (dg.buteurIndex < 0 || dg.buteurIndex >= this.selectedMatch.buteurs.length) {
          console.error('Index de buteur invalide dans disabledGoals:', dg.buteurIndex);
          return false;
        }
        
        const buteur = this.selectedMatch.buteurs[dg.buteurIndex];
        if (!buteur) {
          console.error('Buteur non trouvé à l\'index:', dg.buteurIndex);
          return false;
        }
        
        return dg.matchId === matchId && buteur.equipe === teamNumber;
      });
      
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

  showLocalStorageData() {
    const data = localStorage.getItem('footballMatches');
    this.localStorageData = data ? JSON.parse(data) : 'Aucune donnée trouvée.';
    this.showingLocalStorageData = true;
  }

  hideLocalStorageData() {
    this.showingLocalStorageData = false;
  }

  updateEditFilteredTeams1() {
    const search = this.editTeam1Search.toLowerCase();
    if (search.length < 3) {
      this.editFilteredTeams1 = [];
      return;
    }
    this.editFilteredTeams1 = this.teams
      .map(t => t.name)
      .filter(name => name.toLowerCase().includes(search))
      .filter(name => name !== this.matchEditForm.value.equipe2);
  }

  updateEditFilteredTeams2() {
    const search = this.editTeam2Search.toLowerCase();
    if (search.length < 3) {
      this.editFilteredTeams2 = [];
      return;
    }
    this.editFilteredTeams2 = this.teams
      .map(t => t.name)
      .filter(name => name.toLowerCase().includes(search))
      .filter(name => name !== this.matchEditForm.value.equipe1);
  }

  selectEditTeam1(name: string) {
    this.matchEditForm.patchValue({ equipe1: name });
    this.editTeam1Search = name;
    this.editFilteredTeams1 = [];
  }

  selectEditTeam2(name: string) {
    this.matchEditForm.patchValue({ equipe2: name });
    this.editTeam2Search = name;
    this.editFilteredTeams2 = [];
  }

  updateEditFilteredCompetitions() {
    const search = this.editCompetitionSearch.toLowerCase();
    if (search.length < 3) {
      this.editFilteredCompetitions = [];
      return;
    }
    // Récupère toutes les compétitions uniques des matchs
    const competitions = Array.from(new Set(this.matches.map(m => m.competition).filter((c): c is string => !!c)));
    this.editFilteredCompetitions = competitions
      .filter(name => typeof name === 'string' && name.toLowerCase().includes(search));
  }

  selectEditCompetition(name: string) {
    this.matchEditForm.patchValue({ competition: name });
    this.editCompetitionSearch = name;
    this.editFilteredCompetitions = [];
  }

  getTeamNames(): string[] {
    return this.teams.map(t => t.name);
  }

  getCompetitionNames(): string[] {
    // Récupère toutes les compétitions uniques des matchs
    return Array.from(new Set(this.matches.map(m => m.competition).filter((c): c is string => !!c)));
  }

  updateFilteredButeurNames() {
    const equipe = this.buteurForm.get('equipe')?.value;
    const search = (this.buteurNameSearch || '').toLowerCase();
    if (!equipe || search.length < 3) {
      this.filteredButeurNames = [];
      return;
    }
    this.filteredButeurNames = this.getTeamPlayers(equipe)
      .map(p => p.name)
      .filter(name => name.toLowerCase().includes(search));
  }

  selectButeurName(name: string) {
    this.buteurNameSearch = name;
    this.buteurForm.get('nom')?.setValue(name);
    this.filteredButeurNames = [];
  }

  updateFilteredAssistNames() {
    const equipe = this.buteurForm.get('equipe')?.value;
    const buteur = this.buteurForm.get('nom')?.value;
    const search = (this.assistSearch || '').toLowerCase();
    if (!equipe || search.length < 3) {
      this.filteredAssistNames = [];
      return;
    }
    this.filteredAssistNames = this.getTeamPlayers(equipe)
      .map(p => p.name)
      .filter(name => name !== buteur)
      .filter(name => name.toLowerCase().includes(search));
  }

  selectAssistName(name: string) {
    this.assistSearch = name;
    this.buteurForm.get('assist')?.setValue(name);
    this.filteredAssistNames = [];
  }

  onButeurEquipeChange() {
    // Réinitialiser les champs d'autocomplete quand l'équipe change
    this.buteurNameSearch = '';
    this.filteredButeurNames = [];
    this.assistSearch = '';
    this.filteredAssistNames = [];
    this.buteurForm.get('nom')?.setValue('');
    this.buteurForm.get('assist')?.setValue('');
  }

  // Réinitialiser les champs d'autocomplete à l'ouverture/fermeture de la modale
  gererOuvertureFermetureButeurForm(ouvert: boolean) {
    if (ouvert) {
      this.buteurNameSearch = this.buteurForm.get('nom')?.value || '';
      this.assistSearch = this.buteurForm.get('assist')?.value || '';
    } else {
      this.buteurNameSearch = '';
      this.filteredButeurNames = [];
      this.assistSearch = '';
      this.filteredAssistNames = [];
    }
  }

  shouldShowCreateButeur(): boolean {
    const equipe = this.buteurForm.get('equipe')?.value;
    const search = this.buteurNameSearch;
    if (!equipe || !search || search.length < 3) return false;
    const names = this.getTeamPlayers(equipe).map(p => p.name);
    return this.filteredButeurNames.length === 0 && !names.includes(search);
  }

  shouldShowCreateAssist(): boolean {
    const equipe = this.buteurForm.get('equipe')?.value;
    const search = this.assistSearch;
    if (!equipe || !search || search.length < 3) return false;
    const names = this.getTeamPlayers(equipe).map(p => p.name);
    return this.filteredAssistNames.length === 0 && !names.includes(search);
  }

  shouldShowCreateTeam1(): boolean {
    const search = this.team1Search;
    if (!search || search.length < 3) return false;
    const names = this.getTeamNames();
    return this.filteredTeams1.length === 0 && !names.includes(search);
  }

  shouldShowCreateTeam2(): boolean {
    const search = this.team2Search;
    if (!search || search.length < 3) return false;
    const names = this.getTeamNames();
    return this.filteredTeams2.length === 0 && !names.includes(search);
  }

  shouldShowCreateCompetition(): boolean {
    const search = this.competitionSearch;
    if (!search || search.length < 3) return false;
    const names = this.getCompetitionNames();
    return this.filteredCompetitions.length === 0 && !names.includes(search);
  }

  deleteTeam(teamName: string) {
    const matchesWithTeam = this.matches.filter(
      m => m.equipe1 === teamName || m.equipe2 === teamName
    );
    if (matchesWithTeam.length > 0) {
      const confirmCascade = confirm(
        `L'équipe "${teamName}" est impliquée dans ${matchesWithTeam.length} match(s).\nSupprimer aussi ces matchs ?`
      );
      if (!confirmCascade) return;
      // Supprimer les matchs associés
      this.matches = this.matches.filter(
        m => m.equipe1 !== teamName && m.equipe2 !== teamName
      );
    } else {
      const confirmDelete = confirm(
        `Supprimer définitivement l'équipe "${teamName}" ?`
      );
      if (!confirmDelete) return;
    }
    // Supprimer l'équipe
    this.teams = this.teams.filter(t => t.name !== teamName);
    this.saveData();
    // Si l'équipe était sélectionnée, la désélectionner
    if (this.selectedTeamFilter === teamName) {
      this.selectedTeamFilter = '';
    }
  }

  // Saisons à afficher dans la modale: seulement celles ayant des compétitions, + saison actuelle
  get filteredSeasonsForModal(): string[] {
    const seasonsSet = new Set<string>();

    // Ajouter saisons pour lesquelles il existe au moins un match associé à une compétition
    for (const match of this.matches) {
      if (match.competition && match.competition.trim() !== '') {
        const season = this.getSeasonFromDate(match.heureDebut);
        if (season) seasonsSet.add(season);
      }
    }

    // Forcer l'inclusion de la saison actuelle
    const current = this.getCurrentSeason();
    seasonsSet.add(current);

    // Retourner trié (année de début décroissante)
    return Array.from(seasonsSet).sort((a, b) => {
      const aYear = parseInt(a.split('-')[0]);
      const bYear = parseInt(b.split('-')[0]);
      return bYear - aYear;
    });
  }
}
