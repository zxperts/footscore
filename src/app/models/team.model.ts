export interface Team {
  id: number;
  name: string;
  players: string[];
}

export const TEAMS: Team[] = [
  {
    id: 1,
    name: 'Stand. Flawinne FC',
    players: ['Joueur non listé']
  },
  {
    id: 2,
    name: 'U10 Stand. Flawinne FC',
    players: [
      'Melvin',
      'Kalvin',
      'Thibault',
      'Tom',
      'Maxim',
      'Ely',
      'Mathéo',
      'Elson',
      'Shanna',
      'Stiliano',
      'Mandares',
      'Naofelle',
      'Danielle',
      'Arthur'
    ]
  },
  {
    id: 3,
    name: 'U9 Stand. Flawinne FC',
    players: [
      'Mathieu',
      'Loris',
      'Hugo',
      'Sam',
      'Achille',
      'Dario',
      'Jules',
      'Gabin',
      'Georges'
    ]
  }
];

export function ensureDefaultPlayer(team: Team): Team {
  if (!team.players || team.players.length === 0) {
    team.players = ['Joueur non listé'];
  }
  return team;
} 