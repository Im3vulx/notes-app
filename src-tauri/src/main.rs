// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, Result};
use serde_json::json;
use tokio::runtime::Runtime;

fn init_db() -> Result<()> {
    let conn = Connection::open("notes.db")?;
    conn.execute(
        "CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL
        )",
        [],
    )?;

    // Table for tags
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
        )",
        [],
    )?;

    // Table for mapping notes to tags
    conn.execute(
        "CREATE TABLE IF NOT EXISTS note_tags (
            note_id INTEGER,
            tag_id INTEGER,
            FOREIGN KEY (note_id) REFERENCES notes(id),
            FOREIGN KEY (tag_id) REFERENCES tags(id)
        )",
        [],
    )?;
    Ok(())
}

#[tauri::command]
async fn save_note(title: String, content: String, tags: Vec<String>) -> Result<(), String> {
    let mut conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    let note_id = tx.execute(
        "INSERT INTO notes (title, content) VALUES (?1, ?2)",
        params![title, content],
    ).map_err(|e| format!("Failed to insert note into database: {}", e))?;

    for tag in tags {
        let tag_id = tx.execute(
            "INSERT INTO tags (name) VALUES (?1)",
            params![tag],
        ).map_err(|e| format!("Failed to insert tag into database: {}", e))?;

        tx.execute(
            "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
            params![note_id, tag_id],
        ).map_err(|e| format!("Failed to associate tag with note: {}", e))?;
    }

    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn read_note() -> Result<String, String> {
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    let mut stmt = conn.prepare("SELECT notes.id, title, content, GROUP_CONCAT(tags.name, ', ') FROM notes LEFT JOIN note_tags ON notes.id = note_tags.note_id LEFT JOIN tags ON note_tags.tag_id = tags.id GROUP BY notes.id, title, content").map_err(|e| format!("Failed to prepare SQL statement: {}", e))?;
    let note_iter = stmt.query_map([], |row| {
        let id: i32 = row.get(0)?;
        let title: String = row.get(1)?;
        let content: String = row.get(2)?;
        let tags: Option<String> = row.get(3)?;
        Ok(json!({"id": id, "title": title, "content": content, "tags": tags.unwrap_or_default()}))
    }).map_err(|e| format!("Failed to query notes from database: {}", e))?;

    let mut notes = Vec::new();
    for note_result in note_iter {
        notes.push(note_result.map_err(|e| format!("Failed to retrieve note: {}", e))?);
    }
    let json_string = serde_json::to_string(&notes).map_err(|e| format!("Failed to serialize notes to JSON: {}", e))?;
    Ok(json_string)
}

#[tauri::command]
async fn update_note(id: i32, title: String, content: String, tags: Vec<String>) -> Result<(), String> {
    let mut conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Mettre à jour les informations de la note
    tx.execute(
        "UPDATE notes SET title = ?1, content = ?2 WHERE id = ?3",
        params![title, content, id],
    ).map_err(|e| format!("Failed to update note in database: {}", e))?;

    // Supprimer les anciens tags associés à cette note
    tx.execute("DELETE FROM note_tags WHERE note_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete old tags from note: {}", e))?;

    // Ajouter ou mettre à jour les tags associés à cette note
    for tag in tags {
        let tag_id: Option<i32> = tx.query_row(
            "SELECT id FROM tags WHERE name = ?1",
            params![tag],
            |row| row.get(0)
        ).map_err(|e| format!("Failed to retrieve tag ID: {}", e))?;

        if let Some(tag_id) = tag_id {
            // Le tag existe déjà, associer le tag existant à la note dans la table de liaison
            tx.execute(
                "INSERT INTO note_tags (note_id, tag_id) VALUES (?1, ?2)",
                params![id, tag_id],
            ).map_err(|e| format!("Failed to associate tag with note: {}", e))?;
        } else {
            // Le tag n'existe pas, l'ajouter à la table des tags
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

    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    Ok(())
}

#[tauri::command]
async fn delete_note(id: i32) -> Result<(), String> {
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete note from database: {}", e))?;
    Ok(())
}

fn main() {
    init_db().expect("Failed to initialize database");
    
    let rt = Runtime::new().unwrap();

    rt.block_on(async {
        tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_note, update_note, read_note, delete_note])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    });
}
