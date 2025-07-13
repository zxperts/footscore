11 Juillet 2925

Excellente suggestion : séparer chaque modale en composants Angular dédiés est la meilleure pratique pour la maintenabilité, la réutilisabilité et la clarté du code.
Plan d’organisation
Composants à créer (un par modal principale) :
add-match-modal (Ajouter un Match!)
edit-players-modal (Éditer les joueurs d’une équipe)
buteur-modal (Ajouter/Modifier un buteur)
help-modal (Aide)
ranking-modal (Classement)
export-modal (Export)
team-filter-modal (Filtre équipe)
competition-filter-modal (Filtre compétition)
player-goals-modal (Buts d’un joueur)
new-team-modal (Créer une nouvelle équipe)
(optionnel) disposition-modal (Disposition tactique)
Pour chaque composant modal :
Un fichier .ts, .html, .css dédié.
Les inputs/outputs pour communiquer avec le parent (AppComponent).
La logique d’ouverture/fermeture, et les actions (submit, close, etc.) via des événements.
Dans AppComponent :
On ne garde que l’état global et la logique de gestion.
On affiche les modales via <app-add-match-modal ... *ngIf="showMatchForm"> etc.
On passe les données nécessaires via [inputs] et on écoute les actions via (outputs).

Première étape (proposée) :
Créer le composant add-match-modal (le plus complexe, sert de modèle).
Déplacer le HTML/CSS/TS de la modale d’ajout de match dans ce composant.
Gérer l’ouverture/fermeture et la soumission via des @Input() et @Output().
Adapter AppComponent pour utiliser ce composant.
Répéter pour les autres modales.

Plan de migration des modales en composants Angular
1. Liste des composants à créer
Pour chaque modal, on crée :
add-match-modal
edit-players-modal
buteur-modal
help-modal
ranking-modal
export-modal
team-filter-modal
competition-filter-modal
player-goals-modal
new-team-modal
disposition-modal

2. Pour chaque composant modal
Créer le dossier et les fichiers :
src/app/modals/<modal-name>/<modal-name>.component.ts|html|css
Déplacer le HTML/CSS de la modale dans le composant.
Définir les @Input() pour les données nécessaires (ex : match, équipes, etc.).
Définir les @Output() pour les actions (fermeture, validation, etc.).
Gérer l’ouverture/fermeture via un *ngIf dans le parent.
Adapter le CSS pour que chaque modal garde le fond grisé et le centrage.
3. Dans AppComponent
Remplacer chaque bloc modal par le composant correspondant.
Passer les données et écouter les événements via [inputs] et (outputs).
Supprimer le code HTML des modales du template principal.
4. Organisation du code
Tous les composants modaux sont dans src/app/modals/.
Chaque composant est autonome, mais utilise les modèles et services existants.
Le style global des modales reste centralisé dans le CSS principal.

Déroulement de la migration
Création de l’arborescence et des fichiers de base pour chaque modal.
Migration du HTML/CSS/TS de chaque modal dans son composant.
Ajout des @Input()/@Output() pour chaque composant.
Réécriture du template principal pour utiliser les nouveaux composants.
Test de l’intégration et ajustements.

ng generate component modals/add-match-modal && ng generate component modals/edit-players-modal && ng generate component modals/buteur-modal && ng generate component modals/help-modal && ng generate component modals/ranking-modal && ng generate component modals/export-modal && ng generate component modals/team-filter-modal && ng generate component modals/competition-filter-modal && ng generate component modals/player-goals-modal && ng generate component modals/new-team-modal && ng generate component modals/disposition-modal

La structure de tous les composants modaux a bien été générée.
J’ai extrait tout le code HTML et TypeScript nécessaire pour la migration.
Prochaine étape : migration effective
Pour chaque modal :
Je vais déplacer le HTML de la modale dans le composant dédié (.component.html).
Je vais déplacer la logique TypeScript spécifique (état, méthodes, events) dans le .component.ts correspondant, en utilisant des @Input() et @Output() pour la communication avec AppComponent.
J’adapte le CSS si besoin.
J’intègre chaque composant dans le template principal (app.component.html) à la place de l’ancienne modale, en passant les données et en écoutant les événements.

La première étape de migration de la modale "Ajouter un Match!" en composant dédié est faite côté HTML.
Il reste à :
Déclarer les @Input() et @Output() nécessaires dans le TypeScript du composant.
Déplacer la logique (formulaire, méthodes, états) depuis AppComponent vers ce composant.
Corriger les linter errors en ajoutant les propriétés et méthodes attendues (close, matchForm, onSubmit, etc.).
Brancher ce composant dans AppComponent et lui passer les données/handlers.
Je vais maintenant :
Ajouter tous les inputs/outputs et la logique TypeScript dans add-match-modal.component.ts.
Répéter la même opération pour toutes les autres modales (structure, logique, branchement).
Je commence par corriger et compléter le composant AddMatchModalComponent.

Je vais maintenant :
Remplacer la modale "Ajouter un Match!" dans app.component.html par <app-add-match-modal ...> et brancher tous les inputs/outputs.
Répéter la même opération pour toutes les autres modales (création, wiring, branchement).
Souhaites-tu que je te montre l’intégration de ce premier composant dans AppComponent avant de poursuivre avec les autres, ou j’enchaîne directement la migration complète ?

e vais procéder à la migration complète de toutes les modales en composants Angular, en suivant la même méthode que pour AddMatchModalComponent :
Pour chaque modal :
Déplacer le HTML dans le composant dédié.
Définir les @Input()/@Output() nécessaires dans le .ts.
Adapter le CSS si besoin.
Remplacer l’appel dans app.component.html par le composant, en branchant tous les inputs/outputs.
Nettoyer le code principal.
Je vais procéder modal par modal, en commençant par les plus utilisées (modale buteur, édition joueurs, aide, etc.), jusqu’à ce que tout soit découpé et branché proprement.

La migration du HTML des modales "Ajouter/Modifier un buteur" et "Éditer les joueurs" dans leurs composants dédiés est faite.
Prochaine étape :
Ajouter les @Input()/@Output() et la logique TypeScript dans chaque composant pour corriger les linter errors et permettre la communication avec le parent.
Répéter la même opération pour toutes les autres modales (aide, classement, export, etc.).
Brancher tous les composants dans AppComponent et supprimer les anciens blocs modaux du template principal.
Je poursuis la migration complète, modal par modal, jusqu’à ce que tout soit découpé et branché proprement.
Préviens-moi si tu veux voir un exemple d’intégration ou un état d’avancement intermédiaire !
