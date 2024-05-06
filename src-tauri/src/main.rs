// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, Result};
use serde_json::json;
use tokio::runtime::Runtime;

// Fonction d'initialisation de la base de données
fn init_db() -> Result<()> {
    // Ouvrir la connexion à la base de données ou créer un nouveau fichier s'il n'existe pas
    let conn = Connection::open("notes.db")?;

    // Créer la table des notes si elle n'existe pas déjà
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL
        )",
        [],
    )?;

    // Créer la table des tags si elle n'existe pas déjà
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        )",
        [],
    )?;

    // Créer la table de liaison entre les notes et les tags si elle n'existe pas déjà
    conn.execute(
        "CREATE TABLE IF NOT EXISTS note_tags (
            note_id INTEGER,
            tag_id INTEGER,
            FOREIGN KEY (note_id) REFERENCES notes(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id)
        )",
        [],
    )?;

    // Renvoyer un résultat indiquant le succès de l'initialisation de la base de données
    Ok(())
}

#[tauri::command]
// Fonction pour enregistrer une nouvelle note
async fn save_note(title: String, content: String, tags: Vec<String>) -> Result<(), String> {
    // Ouvrir une connexion à la base de données
    let mut conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    // Commencer une transaction
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Insérer la note dans la table des notes
    let note_id = tx.execute(
        "INSERT INTO notes (title, content) VALUES (?1, ?2)",
        params![title, content],
    ).map_err(|e| format!("Failed to insert note into database: {}", e))?;

    // Parcourir les tags fournis et les associer à la note
    for tag in tags {
        // Insérer le tag dans la table des tags
        let tag_id = tx.execute(
            "INSERT INTO tags (name) VALUES (?1)",
            params![tag],
        ).map_err(|e| format!("Failed to insert tag into database: {}", e))?;

        // Associer le tag à la note dans la table de liaison
        tx.execute(
            "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
            params![note_id, tag_id],
        ).map_err(|e| format!("Failed to associate tag with note: {}", e))?;
    }

    // Valider et terminer la transaction
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    // Renvoyer un résultat indiquant le succès de l'enregistrement de la note
    Ok(())
}

#[tauri::command]
// Fonction pour lire toutes les notes avec leurs tags associés
async fn read_note() -> Result<String, String> {
    // Ouvrir une connexion à la base de données
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Préparer la requête SQL pour récupérer les notes avec leurs tags associés
    let mut stmt = conn.prepare("SELECT notes.id, title, content, GROUP_CONCAT(tags.name, ', ') FROM notes LEFT JOIN note_tags ON notes.id = note_tags.note_id LEFT JOIN tags ON note_tags.tag_id = tags.id GROUP BY notes.id, title, content").map_err(|e| format!("Failed to prepare SQL statement: {}", e))?;
    
    // Exécuter la requête et récupérer les résultats
    let note_iter = stmt.query_map([], |row| {
        let id: i32 = row.get(0)?;
        let title: String = row.get(1)?;
        let content: String = row.get(2)?;
        let tags: Option<String> = row.get(3)?;
        
        // Construire un objet JSON pour chaque note avec ses informations
        Ok(json!({"id": id, "title": title, "content": content, "tags": tags.unwrap_or_default()}))
    }).map_err(|e| format!("Failed to query notes from database: {}", e))?;

    // Collecter tous les objets JSON des notes dans un vecteur
    let mut notes = Vec::new();
    for note_result in note_iter {
        notes.push(note_result.map_err(|e| format!("Failed to retrieve note: {}", e))?);
    }

    // Convertir le vecteur de notes en chaîne JSON
    let json_string = serde_json::to_string(&notes).map_err(|e| format!("Failed to serialize notes to JSON: {}", e))?;
    
    // Renvoyer la chaîne JSON contenant toutes les notes
    Ok(json_string)
}

#[tauri::command]
// Fonction pour mettre à jour une note existante
async fn update_note(id: i32, title: String, content: String, tags: Vec<String>) -> Result<(), String> {
    // Ouvrir une connexion à la base de données
    let mut conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    // Commencer une transaction
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Mettre à jour les informations de la note dans la table des notes
    tx.execute(
        "UPDATE notes SET title = ?1, content = ?2 WHERE id = ?3",
        params![title, content, id],
    ).map_err(|e| format!("Failed to update note in database: {}", e))?;

    // Supprimer les anciens tags associés à cette note de la table de liaison
    tx.execute("DELETE FROM note_tags WHERE note_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete old tags from note: {}", e))?;

    // Ajouter ou mettre à jour les tags associés à cette note
    for tag in tags {
        // Vérifier si le tag existe déjà dans la table des tags
        let tag_id: Option<i32> = tx.query_row(
            "SELECT id FROM tags WHERE name = ?1",
            params![tag],
            |row| row.get(0)
        ).map_err(|e| format!("Failed to retrieve tag ID: {}", e))?;

        if let Some(tag_id) = tag_id {
            // Associer le tag existant à la note dans la table de liaison
            tx.execute(
                "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
                params![id, tag_id],
            ).map_err(|e| format!("Failed to associate tag with note: {}", e))?;
        } else {
            // Ajouter le nouveau tag à la table des tags
            let tag_id = tx.execute(
                "INSERT INTO tags (name) VALUES (?1)",
                params![tag],
            ).map_err(|e| format!("Failed to insert tag into database: {}", e))?;

            // Associer le nouveau tag à la note dans la table de liaison
            tx.execute(
                "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
                params![id, tag_id],
            ).map_err(|e| format!("Failed to associate tag with note: {}", e))?;
        }
    }

    // Valider et terminer la transaction
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    // Renvoyer un résultat indiquant le succès de la mise à jour de la note
    Ok(())
}

#[tauri::command]
// Fonction pour supprimer une note de la base de données
async fn delete_note(id: i32) -> Result<(), String> {
    // Ouvrir une connexion à la base de données
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    // Supprimer la note avec l'ID spécifié de la table des notes
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete note from database: {}", e))?;
    // Renvoyer un résultat indiquant le succès de la suppression de la note
    Ok(())
}

fn main() {
    // Initialiser la base de données
    init_db().expect("Failed to initialize database");
    
    // Créer un nouveau runtime Tokio pour exécuter les futures asynchrones
    let rt = Runtime::new().unwrap();

    // Exécuter le runtime Tokio avec les commandes Tauri spécifiées
    rt.block_on(async {
        tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_note, update_note, read_note, delete_note])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    });
}
