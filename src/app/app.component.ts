import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Match, Buteur } from './models/match.model';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Team, TEAMS, ensureDefaultPlayer } from './models/team.model';
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
  newTeamName: string = '';
  newPlayerName: string = '';
  showGoalCelebration: boolean = false;
  lastGoalScorer: string = '';
  lastGoalTeam: string = '';
  lastGoalAssist: string = '';
  showButeursList: boolean = false;  // Replié par défaut
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
  remainingDots: number = 10;
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
        equipe: this.buteurForm.value.equipe,
        assist: this.buteurForm.value.assist || undefined
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
          this.matches[index].score1++;
          this.lastGoalTeam = this.selectedMatch.equipe1;
        } else {
          this.matches[index].score2++;
          this.lastGoalTeam = this.selectedMatch.equipe2;
        }
        
        // Déclencher la célébration
        this.lastGoalScorer = buteur.nom;
/*         this.showGoalCelebration = true;
        setTimeout(() => {
          this.showGoalCelebration = false;
        }, 3000); */
        
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
        selectedTeam.players.push(playerName.trim());
        this.buteurForm.get('nom')?.setValue(playerName.trim());
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
      this.lastGoalScorer = playerName;
      this.lastGoalTeam = teamNumber === 1 ? this.selectedMatch.equipe1 : this.selectedMatch.equipe2;
      this.lastGoalAssist = '';
      this.remainingDots = 10;
      this.showGoalCelebration = true;
      
      // Démarrer le compte à rebours
      this.celebrationTimer = setInterval(() => {
        this.remainingDots--;
        if (this.remainingDots <= 0) {
          this.showGoalCelebration = false;
          clearInterval(this.celebrationTimer);
          // Enregistrer automatiquement le but
          this.saveGoalWithAssist();
        }
      }, 1000);
    }
  }

  saveGoalWithAssist() {
    if (this.selectedMatch) {
      const buteur: Buteur = {
        nom: this.lastGoalScorer,
        minute: this.calculateElapsedMinutes(this.selectedMatch.heureDebut),
        equipe: this.lastGoalTeam === this.selectedMatch.equipe1 ? 1 : 2,
        assist: this.lastGoalAssist || undefined
      };

      const index = this.matches.findIndex(m => m.id === this.selectedMatch!.id);
      if (index !== -1) {
        this.matches[index].buteurs.push(buteur);
        
        if (buteur.equipe === 1) {
          this.matches[index].score1++;
        } else {
          this.matches[index].score2++;
        }
        
        this.saveData();
        clearInterval(this.celebrationTimer);
        this.showGoalCelebration = false;
      }
    }
  }

  cancelGoal() {
    this.showGoalCelebration = false;
    clearInterval(this.celebrationTimer);
    this.lastGoalScorer = '';
    this.lastGoalTeam = '';
    this.lastGoalAssist = '';
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
        navigator.share({
          title: `${match.equipe1} vs ${match.equipe2}`,
          text: matchInfo,
          url: matchUrl
        }).catch(console.error);
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
    }
  }

  private async loadMatchFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const matchId = urlParams.get('matchId');
    
    if (matchId) {
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
      heureDebut: match.heureDebut.toISOString(),
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
      heureDebut: new Date(match.heureDebut)
    })) : [];
  }

  getSortedMatches(): Match[] {
    return this.filteredMatches.slice().sort((a, b) => new Date(b.heureDebut).getTime() - new Date(a.heureDebut).getTime());
  }
}
