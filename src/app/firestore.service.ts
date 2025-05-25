import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore';
import { Match, Buteur } from './models/match.model';
import { getFirestore } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private firestore: Firestore;

  constructor() {
    this.firestore = getFirestore();
  }

  // Enregistrer un match dans Firestore
  async saveMatch(match: Match): Promise<string> {
    try {
      const matchCollection = collection(this.firestore, 'matches');
      
      // Préparer les données du match pour Firestore
      const matchData = {
        date: match.heureDebut.toISOString(),
        lieu: match.lieu || '',
        equipe1: match.equipe1,
        equipe2: match.equipe2,
        score1: match.score1,
        score2: match.score2,
        buteurs: match.buteurs.map(buteur => ({
          nom: buteur.nom,
          minute: buteur.minute,
          equipe: buteur.equipe,
          assist: buteur.assist || null
        }))
      };

      const docRef = await addDoc(matchCollection, matchData);
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du match:', error);
      throw error;
    }
  }

  // Récupérer tous les matchs
  async getAllMatches(): Promise<Match[]> {
    try {
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
          showElements: data['showElements'] !== undefined ? data['showElements'] : true
        };
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des matchs:', error);
      throw error;
    }
  }

  // Récupérer un match par son ID
  async getMatchById(id: string): Promise<Match | null> {
    try {
      const matchDoc = doc(this.firestore, 'matches', id);
      const docSnapshot = await getDoc(matchDoc);
      
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        return {
          equipe1: data['equipe1'] || '',
          equipe2: data['equipe2'] || '',
          score1: data['score1'] || 0,
          score2: data['score2'] || 0,
          buteurs: data['buteurs'] || [],
          heureDebut: new Date(data['date']),
          lieu: data['lieu'] || '',
          positions: data['positions'] || {},
          showElements: data['showElements'] !== undefined ? data['showElements'] : true
        };
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du match:', error);
      throw error;
    }
  }
} 