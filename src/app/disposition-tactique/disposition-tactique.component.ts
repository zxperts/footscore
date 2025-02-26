import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { PositionService } from '../position.service'; // Adjust the path if necessary


@Component({
  selector: 'app-disposition-tactique',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disposition-tactique.component.html',
  styleUrls: ['./disposition-tactique.component.css']
})
export class DispositionTactiqueComponent {
  showDisposition: boolean = false;
  selectedMatch: any; // Remplacez par le type approprié
  selectedPosition: { team: number; position: string } | null = null;

  toggleDispositionView() {
    this.showDisposition = !this.showDisposition;
  }

  getPlayerForPosition(team: number, position: string) {
    // Implémentez la logique pour obtenir le joueur pour la position donnée
  }

  constructor(private positionService: PositionService) {}

  selectPosition(team: number, position: string) {
    this.positionService.selectPosition(team, position);
    this.selectedPosition = { team, position }; // Optional: Update local state if needed
  }
}