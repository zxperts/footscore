import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, getDoc, query, where, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Match, Buteur } from './models/match.model';
import { Competition } from './models/competition.model';

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
        updatedAt: data['updatedAt'] ? new Date(data['updatedAt']) : new Date()
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
        updatedAt: data['updatedAt'] ? new Date(data['updatedAt']) : new Date()
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
} 