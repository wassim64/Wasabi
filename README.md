# Visualisation des Genres Musicaux - Projet WASABI

## 📋 Description
Ce projet propose une exploration interactive des genres musicaux à travers différentes visualisations complémentaires. Il permet d'analyser les relations entre les genres, leur évolution temporelle et leur distribution géographique.

## 🎯 Visualisations disponibles
1. **Visualisation en Arbre** (Elias)
   - Représentation hiérarchique des genres musicaux
   - Navigation interactive dans les sous-genres
   - Connexions entre genres parents et enfants

2. **Visualisation en Réseau** (Damien)
   - Graphe des connexions entre genres basé sur les artistes communs
   - Filtrage par période et nombre de connexions
   - Zoom et exploration interactive

3. **Visualisation en Aires Empilées** (Karim)
   - Évolution temporelle des genres musicaux
   - Analyse des tendances et proportions
   - Filtrage par pays et période

4. **Carte Choroplèthe** (Wassim)
   - Distribution géographique des genres
   - Analyse par pays et région
   - Évolution temporelle de la répartition

5. **Diagramme en Boîte** (Romain)
   - Analyse de la longévité des carrières par genre
   - Statistiques sur les durées de carrière
   - Comparaison entre genres

## 🚀 Installation et lancement

### Prérequis
- Node.js et npm installés
- Python 3.x installé
- Un IDE (recommandé : Visual Studio Code)

### Étapes d'installation
1. Cloner le repository
2. Ouvrir le dossier dans l'IDE
3. Ouvrir un terminal (Terminal -> Nouveau Terminal)
4. Installer les dépendances :
    ```bash
    npm install
    ```
### Lancement du serveur
1. Démarrer le serveur :
    ```bash
    npm start
    ```
2. Accéder à l'application : http://localhost:3000/damien/index.html

Pour accéder aux autres visualisations
- http://localhost:3000/karim/index.html
- http://localhost:3000/wassim/choroplethMap-withoutFlask.html
- http://localhost:3000/romain/boxDiagram.html
- http://localhost:3000/Elias/index.html
