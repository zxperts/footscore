import { Component } from '@angular/core';
import { Team, TEAMS } from '../../models/team.model'; // Adjust the import path as necessary
import { CommonModule } from '@angular/common'; // Ajoutez cette ligne


@Component({
  selector: 'app-equipes',
  templateUrl: './equipes.component.html',
  styleUrls: ['./equipes.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class EquipesComponent {
  teams: Team[] = TEAMS; // Assuming TEAMS is imported from your model
} 