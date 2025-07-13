import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';

@Component({
  selector: 'app-add-match-modal',
  templateUrl: './add-match-modal.component.html',
  styleUrls: ['./add-match-modal.component.css']
})
export class AddMatchModalComponent {
  @Input() matchForm!: FormGroup;
  @Input() team1Search!: string;
  @Input() team2Search!: string;
  @Input() filteredTeams1!: string[];
  @Input() filteredTeams2!: string[];
  @Input() competitionSearch!: string;
  @Input() filteredCompetitions!: string[];
  @Input() shouldShowCreateTeam1!: () => boolean;
  @Input() shouldShowCreateTeam2!: () => boolean;
  @Input() shouldShowCreateCompetition!: () => boolean;
  @Input() updateFilteredTeams1!: () => void;
  @Input() updateFilteredTeams2!: () => void;
  @Input() updateFilteredCompetitions!: () => void;
  @Input() selectTeam1!: (name: string) => void;
  @Input() selectTeam2!: (name: string) => void;
  @Input() selectCompetition!: (name: string) => void;

  @Output() close = new EventEmitter<void>();
  @Output() exportMatches = new EventEmitter<void>();
  @Output() importMatches = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();

  onSubmit() {
    this.submit.emit();
  }
}
