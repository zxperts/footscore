import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Match, Buteur, DuelGagne, Dribble, Interception, Frappe, Faute, ContreAttaque, TikiTaka } from './models/match.model';
import { Competition } from './models/competition.model';
import { SharedTeam } from './models/team.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  // Enregistrer un match dans Firestore
  async saveMatch(match: Match): Promise<string> {
    const matchRef = await addDoc(collection(this.firestore, 'matches'), {
      ...match,
      heureDebut: match.heureDebut.toISOString(),
      updatedAt: new Date()
    });
    console.log('Match saved:', matchRef.id);
    return matchRef.id;
  }

  // Récupérer tous les matchs
  async getAllMatches(): Promise<Match[]> {
    const matchCollection = collection(this.firestore, 'matches');
    const querySnapshot = await getDocs(matchCollection);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        equipe1: data['equipe1'] || '',
        equipe2: data['equipe2'] || '',
        score1: data['score1'] || 0,
        score2: data['score2'] || 0,
        buteurs: data['buteurs'] || [],
        heureDebut: new Date(data['date']),
        lieu: data['lieu'] || '',
        positions: data['positions'] || {},
        showElements: data['showElements'] !== undefined ? data['showElements'] : true,
        updatedAt: data['updatedAt'] ? new Date(data['updatedAt']) : new Date(),
        duelsGagnes: data['duelsGagnes'] || [],
        dribbles: data['dribbles'] || [],
        interceptions: data['interceptions'] || [],
        frappes: data['frappes'] || [],
        fautes: data['fautes'] || [],
        contreAttaques: data['contreAttaques'] || [],
        tikiTakas: data['tikiTakas'] || [],
        competition: data['competition'] || undefined
      };
    });
  }

  // Récupérer un match par son ID
  async getMatchById(matchId: string): Promise<Match | null> {
    const matchDoc = await getDoc(doc(this.firestore, 'matches', matchId));
    if (matchDoc.exists()) {
      const data = matchDoc.data();
      const match: Match = {
        equipe1: data['equipe1'] || '',
        equipe2: data['equipe2'] || '',
        score1: data['score1'] || 0,
        score2: data['score2'] || 0,
        buteurs: data['buteurs'] || [],
        heureDebut: new Date(data['heureDebut']),
        lieu: data['lieu'] || '',
        positions: data['positions'] || {},
        showElements: data['showElements'] !== undefined ? data['showElements'] : true,
        competition: data['competition'] || undefined,
        updatedAt: data['updatedAt'] ? new Date(data['updatedAt']) : new Date(),
        duelsGagnes: data['duelsGagnes'] || [],
        dribbles: data['dribbles'] || [],
        interceptions: data['interceptions'] || [],
        frappes: data['frappes'] || [],
        fautes: data['fautes'] || [],
        contreAttaques: data['contreAttaques'] || [],
        tikiTakas: data['tikiTakas'] || []
      };
      return match;
    }
    return null;
  }

  // Nouvelles méthodes pour les compétitions
  async saveCompetition(competition: Competition): Promise<string> {
    const competitionRef = await addDoc(collection(this.firestore, 'competitions'), {
      ...competition,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Competition saved:', competitionRef.id);
    return competitionRef.id;
  }

  async getCompetitionById(competitionId: string): Promise<Competition | null> {
    const competitionDoc = await getDoc(doc(this.firestore, 'competitions', competitionId));
    if (competitionDoc.exists()) {
      return {
        ...competitionDoc.data(),
        id: competitionDoc.id
      } as Competition;
    }
    return null;
  }

  async getCompetitionByName(name: string): Promise<Competition | null> {
    const competitionsRef = collection(this.firestore, 'competitions');
    const q = query(competitionsRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        ...doc.data(),
        id: doc.id
      } as Competition;
    }
    return null;
  }

  async addMatchToCompetition(competitionId: string, matchId: string): Promise<void> {
    const competitionRef = doc(this.firestore, 'competitions', competitionId);
    const competition = await this.getCompetitionById(competitionId);
    
    if (competition) {
      const updatedMatchIds = [...competition.matchIds, matchId];
      await updateDoc(competitionRef, {
        matchIds: updatedMatchIds,
        updatedAt: new Date()
      });
    }
  }

  async getMatchesByCompetition(competitionId: string): Promise<Match[]> {
    const competition = await this.getCompetitionById(competitionId);
    if (!competition) return [];

    const matches: Match[] = [];
    for (const matchId of competition.matchIds) {
      const match = await this.getMatchById(matchId);
      if (match) {
        matches.push(match);
      }
    }
    return matches;
  }

  async shareCompetition(
    competitionName: string, 
    matches: Match[], 
    onLog?: (message: string) => void
  ): Promise<string> {
    // Créer une nouvelle compétition
    const competition = {
      name: competitionName,
      matchIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const competitionId = await this.saveCompetition(competition);
    onLog?.('Compétition créée');
    return competitionId;
  }

  // Méthodes pour les équipes partagées
  async saveTeam(team: SharedTeam): Promise<string> {
    const teamRef = await addDoc(collection(this.firestore, 'teams'), {
      ...team,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Team saved:', teamRef.id);
    return teamRef.id;
  }

  async getTeamById(teamId: string): Promise<SharedTeam | null> {
    const teamDoc = await getDoc(doc(this.firestore, 'teams', teamId));
    if (teamDoc.exists()) {
      return {
        ...teamDoc.data(),
        id: teamDoc.id
      } as SharedTeam;
    }
    return null;
  }

  async getTeamByName(name: string): Promise<SharedTeam | null> {
    const teamsRef = collection(this.firestore, 'teams');
    const q = query(teamsRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        ...doc.data(),
        id: doc.id
      } as SharedTeam;
    }
    return null;
  }

  async getAllTeams(): Promise<SharedTeam[]> {
    const teamsRef = collection(this.firestore, 'teams');
    const querySnapshot = await getDocs(teamsRef);
    
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as SharedTeam));
  }

  async addMatchToTeam(teamId: string, matchId: string): Promise<void> {
    const teamRef = doc(this.firestore, 'teams', teamId);
    const team = await this.getTeamById(teamId);
    
    if (team) {
      const updatedMatchIds = [...team.matchIds, matchId];
      await updateDoc(teamRef, {
        matchIds: updatedMatchIds,
        updatedAt: new Date()
      });
    }
  }

  async getMatchesByTeam(teamId: string): Promise<Match[]> {
    const team = await this.getTeamById(teamId);
    if (!team) return [];

    const matches: Match[] = [];
    for (const matchId of team.matchIds) {
      const match = await this.getMatchById(matchId);
      if (match) {
        matches.push(match);
      }
    }
    return matches;
  }

  async shareTeam(
    teamName: string, 
    matches: Match[], 
    onLog?: (message: string) => void
  ): Promise<string> {
    // Créer une nouvelle équipe partagée
    const team: SharedTeam = {
      name: teamName,
      matchIds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const teamId = await this.saveTeam(team);
    onLog?.('Équipe créée');
    
    // Sauvegarder tous les matchs de l'équipe et les associer
    for (const match of matches) {
      const matchId = await this.saveMatch(match);
      await this.addMatchToTeam(teamId, matchId);
      onLog?.(`Match ${match.equipe1} vs ${match.equipe2} ajouté à l'équipe`);
    }
    
    onLog?.('Équipe sauvegardée avec succès !');
    return teamId;
  }
}