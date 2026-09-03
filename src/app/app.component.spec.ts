import { FormBuilder } from '@angular/forms';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('should create the app', () => {
    const app = new AppComponent(new FormBuilder(), {} as any, { navigate: jasmine.createSpy('navigate') } as any);
    expect(app).toBeTruthy();
  });

  it('should use team names and match day for identity, not the exact start time', () => {
    const app = new AppComponent(new FormBuilder(), {} as any, { navigate: jasmine.createSpy('navigate') } as any);

    const match1 = {
      equipe1: 'Team A',
      equipe2: 'Team B',
      heureDebut: new Date('2026-08-29T18:00:00'),
      score1: 2,
      score2: 1,
      buteurs: [],
      duelsGagnes: [],
      dribbles: [],
      interceptions: [],
      frappes: [],
      fautes: [],
      contreAttaques: [],
      tikiTakas: [],
      updatedAt: new Date()
    };

    const match2 = {
      equipe1: 'Team A',
      equipe2: 'Team B',
      heureDebut: new Date('2026-08-29T20:45:00'),
      score1: 3,
      score2: 1,
      buteurs: [],
      duelsGagnes: [],
      dribbles: [],
      interceptions: [],
      frappes: [],
      fautes: [],
      contreAttaques: [],
      tikiTakas: [],
      updatedAt: new Date()
    };

    expect((app as any).getMatchIdentity(match1)).toBe((app as any).getMatchIdentity(match2));
    expect((app as any).getMatchIdentity(match1)).toContain('team a__team b__2026-08-29');
  });

  function createTestMatch(overrides: Partial<any> = {}): any {
    return {
      id: 1,
      equipe1: 'Team A',
      equipe2: 'Team B',
      score1: 0,
      score2: 0,
      buteurs: [],
      duelsGagnes: [],
      dribbles: [],
      interceptions: [],
      frappes: [],
      fautes: [],
      contreAttaques: [],
      tikiTakas: [],
      heureDebut: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  it('should keep selectedMatch synced with matches after saveData so subsequent score edits are not lost', () => {
    const app = new AppComponent(new FormBuilder(), {} as any, { navigate: jasmine.createSpy('navigate') } as any);
    const match = createTestMatch();
    app.matches = [match];
    app.selectedMatch = match;

    // saveData() rebuilds match objects (deduplicateMatchesByKey), selectedMatch must be repointed
    (app as any).saveData();
    expect(app.selectedMatch).toBe(app.matches[0]);

    // Simulate a second score edit made through the "Modifier le score" modal
    app.selectedMatch!.score1 = 1;
    (app as any).saveData();

    expect(app.matches[0].score1).toBe(1);
    expect(app.selectedMatch).toBe(app.matches[0]);

    // A third edit must still propagate to the main screen list
    app.selectedMatch!.score1 = 2;
    (app as any).saveData();

    expect(app.matches[0].score1).toBe(2);
  });

  it('should sync the typed team name into matchEditForm so renaming a team takes effect', () => {
    const app = new AppComponent(new FormBuilder(), {} as any, { navigate: jasmine.createSpy('navigate') } as any);

    app.editTeam1Search = 'Nouvelle Equipe 1';
    app.updateEditFilteredTeams1();
    expect(app.matchEditForm.value.equipe1).toBe('Nouvelle Equipe 1');

    app.editTeam2Search = 'Nouvelle Equipe 2';
    app.updateEditFilteredTeams2();
    expect(app.matchEditForm.value.equipe2).toBe('Nouvelle Equipe 2');
  });

  it('should apply the renamed team to the selected match on submit', () => {
    const app = new AppComponent(new FormBuilder(), {} as any, { navigate: jasmine.createSpy('navigate') } as any);
    const match = createTestMatch();
    app.matches = [match];
    app.selectedMatch = match;

    app.matchEditForm.patchValue({
      equipe1: 'Nouvelle Equipe 1',
      equipe2: match.equipe2,
      heureDebut: (app as any).toDateTimeLocalValue(match.heureDebut),
      lieu: '',
      competition: '',
      commentaire: ''
    });

    app.onSubmitMatchEdit();

    expect(app.selectedMatch!.equipe1).toBe('Nouvelle Equipe 1');
  });

  it('should reactivate a disabled (barred) goal and recount it in the score', () => {
    const app = new AppComponent(new FormBuilder(), {} as any, { navigate: jasmine.createSpy('navigate') } as any);
    const match = createTestMatch({
      buteurs: [{ nom: 'Joueur X', minute: 10, equipe: 1 }]
    });
    app.matches = [match];
    app.selectedMatch = match;
    app.disabledGoals = [{ matchId: 1, buteurIndex: 0 }];

    expect(app.isGoalDisabled(0)).toBeTrue();

    app.reactiverButeur(0, 0);

    expect(app.isGoalDisabled(0)).toBeFalse();
    expect(match.score1).toBe(1);
    expect(match.buteurs.length).toBe(1);
    expect(app.disabledGoals.length).toBe(0);
  });

  it('should not change anything when trying to reactivate a goal that is not disabled', () => {
    const app = new AppComponent(new FormBuilder(), {} as any, { navigate: jasmine.createSpy('navigate') } as any);
    const match = createTestMatch({
      score1: 1,
      buteurs: [{ nom: 'Joueur X', minute: 10, equipe: 1 }]
    });
    app.matches = [match];
    app.selectedMatch = match;
    app.disabledGoals = [];

    app.reactiverButeur(0, 0);

    expect(match.score1).toBe(1);
    expect(app.disabledGoals.length).toBe(0);
  });
});
