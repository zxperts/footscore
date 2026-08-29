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
});
