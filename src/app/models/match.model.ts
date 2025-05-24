export interface Buteur {
  nom: string;
  minute: number;
  equipe: number;
  assist?: string;
}

export interface Recuperation {
  nom: string;
  minute: number;
  equipe: number;
}

export interface Match {
  id: number;
  equipe1: string;
  equipe2: string;
  heureDebut: Date;
  lieu?: string;
  competition?: string;
  score1: number;
  score2: number;
  buteurs: Buteur[];
  recuperations: Recuperation[];
  showElements: boolean;
  positions?: { [key: string]: string };
} 