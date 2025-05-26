export interface Buteur {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
  assist?: string; // Ajout du champ assist optionnel
}

export interface Match {
  id?: number;
  equipe1: string;
  equipe2: string;
  score1: number;
  score2: number;
  buteurs: Buteur[];
  heureDebut: Date;
  lieu?: string;
  positions?: { [key: string]: string };
  showElements?: boolean;
  competition?: string; // Ajout du champ compétition
  updatedAt: Date;
} 