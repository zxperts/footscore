import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Competition {
  id?: string;
  name: string;
  description?: string;
  season?: string;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CompetitionUpdate {
  oldName: string;
  newCompetition: Competition;
}

@Component({
  selector: 'app-competition-filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './competition-filter-modal.component.html',
  styleUrl: './competition-filter-modal.component.css'
})
export class CompetitionFilterModalComponent {
  @Input() competitions: string[] = [];
  @Input() selectedSeason: string = '';
  @Input() selectedCompetition: string = '';
  @Input() isCompetitionWithoutSeason: (competition: string) => boolean = () => false;
  @Input() getSuggestedSeason: (competition: string) => string | null = () => null;
  @Input() availableSeasons: string[] = [];
  
  @Output() competitionSelected = new EventEmitter<string>();
  @Output() competitionAdded = new EventEmitter<Competition>();
  @Output() competitionUpdated = new EventEmitter<CompetitionUpdate>();
  @Output() competitionDeleted = new EventEmitter<string>();
  @Output() assignSeason = new EventEmitter<{competition: string, season: string}>();
  @Output() closeModal = new EventEmitter<void>();
  @Output() seasonChanged = new EventEmitter<string>();

  // États du modal
  showAddForm = false;
  showEditForm = false;
  editingCompetition: Competition | null = null;

  // Formulaire d'ajout/édition
  competitionForm: Competition = {
    name: '',
    description: '',
    season: '',
    type: ''
  };

  // Types de compétitions prédéfinis
  competitionTypes = [
    'Championnat',
    'Coupe',
    'Tournoi',
    'Match amical',
    'Playoff',
    'Autre'
  ];

  // Saisons disponibles (peuvent être injectées par le parent)
  // availableSeasons déjà défini en @Input

  ngOnInit() {
    // Si le parent ne fournit pas de saisons, générer une liste par défaut
    if (!this.availableSeasons || this.availableSeasons.length === 0) {
      this.availableSeasons = this.generateSeasons();
    }
    this.competitionForm.season = this.selectedSeason;
  }

  // Générer les saisons disponibles
  private generateSeasons(): string[] {
    const currentYear = new Date().getFullYear();
    const seasons = [];
    
    // Générer les 5 dernières saisons et les 2 prochaines
    for (let i = -5; i <= 2; i++) {
      const year = currentYear + i;
      if (year >= 2020) { // Limiter aux saisons récentes
        seasons.push(`${year}-${year + 1}`);
      }
    }
    
    return seasons;
  }

  // Sélectionner une compétition
  selectCompetition(competition: string) {
    this.selectedCompetition = competition;
    this.competitionSelected.emit(competition);
    this.closeModal.emit();
  }

  // Ouvrir le formulaire d'ajout
  openAddForm() {
    this.showAddForm = true;
    this.showEditForm = false;
    this.resetForm();
  }

  // Ouvrir le formulaire d'édition
  openEditForm(competition: string) {
    this.editingCompetition = { name: competition, season: this.selectedSeason };
    this.competitionForm = { ...this.editingCompetition };
    this.showEditForm = true;
    this.showAddForm = false;
  }

  // Annuler l'ajout/édition
  cancelForm() {
    this.showAddForm = false;
    this.showEditForm = false;
    this.resetForm();
  }

  // Valider le formulaire
  submitForm() {
    if (this.competitionForm.name.trim()) {
      if (this.showAddForm) {
        this.competitionAdded.emit({
          ...this.competitionForm,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else if (this.showEditForm && this.editingCompetition) {
        this.competitionUpdated.emit({
          oldName: this.editingCompetition.name,
          newCompetition: {
            ...this.competitionForm,
            id: this.editingCompetition.id,
            updatedAt: new Date()
          }
        });
      }
      
      this.cancelForm();
    }
  }

  // Supprimer une compétition
  deleteCompetition(competition: string) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la compétition "${competition}" ?\n\nAttention : Cette action supprimera également tous les matchs associés.`)) {
      this.competitionDeleted.emit(competition);
    }
  }

  // Attribuer une saison à une compétition
  assignSeasonToCompetition(competition: string, season: string) {
    this.assignSeason.emit({ competition, season });
  }



  // Ouvrir le sélecteur de saison pour attribution
  openSeasonAssignment(competition: string) {
    const suggestedSeason = this.getSuggestedSeason(competition);
    let promptMessage = `Attribuer une saison à la compétition "${competition}"\n\n`;
    
    if (suggestedSeason) {
      promptMessage += `Saison suggérée (basée sur le premier match) : ${suggestedSeason}\n\n`;
    }
    
    promptMessage += `Saisons disponibles :\n${this.availableSeasons.join('\n')}\n\nEntrez la saison souhaitée :`;
    
    const season = prompt(promptMessage);
    
    if (season && this.availableSeasons.includes(season)) {
      this.assignSeasonToCompetition(competition, season);
    } else if (season) {
      alert('Saison invalide. Veuillez choisir une saison de la liste.');
    }
  }

  // Réinitialiser le formulaire
  private resetForm() {
    this.competitionForm = {
      name: '',
      description: '',
      season: this.selectedSeason,
      type: 'Championnat'
    };
    this.editingCompetition = null;
  }

  // Fermer le modal
  close() {
    this.closeModal.emit();
  }
}
