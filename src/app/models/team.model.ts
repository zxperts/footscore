export interface Player {
  name: string;
  type: 'attaquant' | 'milieu' | 'defenseur';
}

export interface Team {
  id: number;
  name: string;
  players: Player[];
}

export const TEAMS: Team[] = [
  {
    id: 1,
    name: 'Stand. Flawinne FC',
    players: [{ name: 'Joueur non listé', type: 'milieu' }]
  },
  {
    id: 2,
    name: 'U10 Stand. Flawinne FC',
    players: [
      { name: 'Melvin', type: 'milieu' },
      { name: 'Kalvin', type: 'milieu' },
      { name: 'Thibault', type: 'milieu' },
      { name: 'Tom', type: 'milieu' },
      { name: 'Maxim', type: 'milieu' },
      { name: 'Ely', type: 'milieu' },
      { name: 'Mathéo', type: 'milieu' },
      { name: 'Elson', type: 'milieu' },
      { name: 'Shanna', type: 'milieu' },
      { name: 'Stiliano', type: 'milieu' },
      { name: 'Mandares', type: 'milieu' },
      { name: 'Naofelle', type: 'milieu' },
      { name: 'Daniel', type: 'milieu' },
      { name: 'Arthur', type: 'milieu' }
    ]
  },
  {
    id: 3,
    name: 'U9 Stand. Flawinne FC',
    players: [
      { name: 'Mathieu', type: 'milieu' },
      { name: 'Loris', type: 'milieu' },
      { name: 'Hugo', type: 'milieu' },
      { name: 'Sam', type: 'milieu' },
      { name: 'Achille', type: 'milieu' },
      { name: 'Dario', type: 'milieu' },
      { name: 'Jules', type: 'milieu' },
      { name: 'Gabin', type: 'milieu' },
      { name: 'Georges', type: 'milieu' }
    ]
  },
  {
    id: 4,
    name: 'U11B Stand. Flawinne FC',
    players: [
      { name: 'Melvin', type: 'milieu' },
      { name: 'Kalvin', type: 'milieu' },
      { name: 'Thibault', type: 'milieu' },
      { name: 'Tom', type: 'milieu' },
      { name: 'Maxim', type: 'milieu' },
      { name: 'Ely', type: 'milieu' },
      { name: 'Mathéo', type: 'milieu' },
      { name: 'Elson', type: 'milieu' },
      { name: 'Shanna', type: 'milieu' },
      { name: 'Stiliano', type: 'milieu' },
      { name: 'Mandares', type: 'milieu' },
      { name: 'Naofelle', type: 'milieu' },
      { name: 'Daniel', type: 'milieu' },
      { name: 'Arthur', type: 'milieu' }
    ]
  },
  {
    id: 5,
    name: 'U10A Stand. Flawinne FC',
    players: [
      { name: 'Mathieu', type: 'milieu' },
      { name: 'Loris', type: 'milieu' },
      { name: 'Hugo', type: 'milieu' },
      { name: 'Sam', type: 'milieu' },
      { name: 'Achille', type: 'milieu' },
      { name: 'Dario', type: 'milieu' },
      { name: 'Jules', type: 'milieu' },
      { name: 'Gabin', type: 'milieu' },
      { name: 'Georges', type: 'milieu' }
    ]
  }
];

export function ensureDefaultPlayer(team: Team): Team {
  if (!team.players || team.players.length === 0) {
    team.players = [{ name: 'Joueur non listé', type: 'milieu' }];
  }
  return team;
} 