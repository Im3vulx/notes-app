# Documentation du Projet de Gestion de Notes

## Introduction
Ce projet est une application de gestion de notes que j'ai développée dans le cadre de mon cursus d'études en troisième année. Il combine plusieurs technologies modernes de développement logiciel, me permettant d'acquérir une expérience pratique dans la création d'applications de bureau.

## Objectif
Mon objectif principal avec ce projet est de renforcer mes compétences en développement logiciel en me familiarisant avec les concepts suivants :

## Recommended IDE Setup
- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Programmation en Rust pour le développement du backend.

- Utilisation de HTML, CSS et JavaScript pour le développement du frontend.
- Interaction entre le frontend et le backend à l'aide de Tauri.
- Utilisation d'une base de données SQLite pour le stockage des données.

## Fonctionnalités
Le projet comprend les fonctionnalités suivantes, conçues pour me permettre de pratiquer différents aspects du développement logiciel :

- Créer une nouvelle note : J'apprends à gérer les entrées utilisateur et à stocker les données en base de données.
- Afficher toutes les notes : J'explore la récupération des données depuis la base de données et leur affichage dans l'interface utilisateur.
- Mettre à jour une note existante : Je pratique la manipulation des données existantes et la mise à jour de l'interface utilisateur en conséquence.
- Supprimer une note : J'apprends à gérer les opérations de suppression et à maintenir la cohérence des données.

## Structure du Projet
J'ai organisé le projet de manière à refléter les meilleures pratiques de développement logiciel et à faciliter ma compréhension et mon apprentissage. Voici la structure générale du projet :

- frontend/ : Contient le code HTML, CSS et JavaScript pour le frontend de l'application.
- backend/ : Contient le code Rust pour le backend de l'application.
- notes.db : Fichier de base de données SQLite pour stocker les notes.
- Cargo.toml : Fichier de configuration Cargo pour les dépendances Rust.
- package.json : Fichier de configuration npm pour les dépendances JavaScript.
- README.md : Fichier de documentation principal du projet.

## Dépendances
Le projet utilise les dépendances suivantes pour son développement :

- Tauri : Bibliothèque pour le développement d'applications de bureau multiplateformes en utilisant des technologies web.
- rusqlite : Bibliothèque Rust pour l'interaction avec la base de données SQLite.
- Quill : Éditeur de texte riche utilisé pour la saisie du contenu des notes.
- Tokio : Bibliothèque Rust pour la gestion asynchrone des opérations.

## Installation et Utilisation
Pour installer et utiliser le projet sur ma machine de développement, je suis ces étapes :

Cloner le Dépôt :
```
git clone https://github.com/votre-utilisateur/tauri-notes-app.git
```
Naviguer vers le Répertoire :
```
cd tauri-notes-app
```
Installer les Dépendances :
```
# Backend (Rust) cd tauri cargo build # Frontend (JavaScript) cd ../src-tauri npm install
```
Pour tester votre application pendant le développement, utilisez la commande suivante :
```
tauri dev
```