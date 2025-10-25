export interface Buteur {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
  assist?: string; // Ajout du champ assist optionnel
}

export interface DuelGagne {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
}

export interface Dribble {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
}

export interface Interception {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
}

export interface Frappe {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
}

export interface Faute {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
}

export interface ContreAttaque {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
}

export interface TikiTaka {
  nom: string;
  minute: number;
  equipe: 1 | 2; // 1 pour equipe1, 2 pour equipe2
}

export interface Match {
  id?: number;
  equipe1: string;
  equipe2: string;
  score1: number;
  score2: number;
  buteurs: Buteur[];
  duelsGagnes: DuelGagne[]; // Ajout du champ duels gagnés
  dribbles: Dribble[]; // Ajout du champ dribbles
  interceptions: Interception[]; // Ajout du champ interceptions
  frappes: Frappe[]; // Ajout du champ frappes
  fautes: Faute[]; // Ajout du champ fautes
  contreAttaques: ContreAttaque[]; // Ajout du champ contre-attaques
  tikiTakas: TikiTaka[]; // Ajout du champ tiki-taka
  heureDebut: Date;
  lieu?: string;
  positions?: { [key: string]: string };
  showElements?: boolean;
  competition?: string; // Ajout du champ compétition
  updatedAt: Date;
} 