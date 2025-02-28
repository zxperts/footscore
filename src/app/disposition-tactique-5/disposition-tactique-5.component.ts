import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { PositionService } from '../position.service';
import { DispositionTactiqueComponent } from "../disposition-tactique/disposition-tactique.component"; // Adjust the path if necessary

@Component({
  selector: 'app-disposition-tactique-5',
  standalone: true,
  imports: [CommonModule, DispositionTactiqueComponent],
  templateUrl: './disposition-tactique-5.component.html',
  styleUrls: ['./disposition-tactique-5.component.css']
})
export class DispositionTactique5Component {
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
  // Logic for the 5-player formation can be added here
} 