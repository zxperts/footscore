import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PositionService {
  private selectedPosition: { team: number; position: string } | null = null;

  constructor() {}

  selectPosition(team: number, position: string) {
    this.selectedPosition = { team, position };
  }

  getSelectedPosition() {
    return this.selectedPosition;
  }

  clearSelectedPosition() {
    this.selectedPosition = null;
  }
}
