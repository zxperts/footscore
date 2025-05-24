import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, getDoc, query, where } from '@angular/fire/firestore';
import { Match } from './models/match.model';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  async saveMatch(match: Match): Promise<string> {
    const matchData = {
      ...match,
      heureDebut: match.heureDebut.toISOString()
    };
    const docRef = await addDoc(collection(this.firestore, 'matches'), matchData);
    return docRef.id;
  }

  async getMatchById(matchId: string): Promise<Match | null> {
    const docRef = doc(this.firestore, 'matches', matchId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: parseInt(matchId),
        equipe1: data['equipe1'],
        equipe2: data['equipe2'],
        heureDebut: new Date(data['heureDebut']),
        lieu: data['lieu'],
        competition: data['competition'],
        score1: data['score1'],
        score2: data['score2'],
        buteurs: data['buteurs'] || [],
        recuperations: data['recuperations'] || [],
        showElements: data['showElements'] ?? true,
        positions: data['positions'] || {}
      };
    }
    return null;
  }

  async getMatchesByCompetition(competition: string): Promise<Match[]> {
    const q = query(
      collection(this.firestore, 'matches'),
      where('competition', '==', competition)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: parseInt(doc.id),
        equipe1: data['equipe1'],
        equipe2: data['equipe2'],
        heureDebut: new Date(data['heureDebut']),
        lieu: data['lieu'],
        competition: data['competition'],
        score1: data['score1'],
        score2: data['score2'],
        buteurs: data['buteurs'] || [],
        recuperations: data['recuperations'] || [],
        showElements: data['showElements'] ?? true,
        positions: data['positions'] || {}
      };
    });
  }
} 