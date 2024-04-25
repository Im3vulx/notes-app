// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{params, Connection, Result};
use serde_json::json;

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
    Ok(())
}

#[tauri::command]
fn save_note(title: String, content: String) -> Result<(), String> {
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute(
        "INSERT INTO notes (title, content) VALUES (?1, ?2)",
        params![title, content],
    ).map_err(|e| format!("Failed to insert note into database: {}", e))?;
    Ok(())
}

#[tauri::command]
fn read_note() -> Result<String, String> {
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, title, content FROM notes").map_err(|e| format!("Failed to prepare SQL statement: {}", e))?;
    let note_iter = stmt.query_map([], |row| {
        let id: i32 = row.get(0)?;
        let title: String = row.get(1)?;
        let content: String = row.get(2)?;
        Ok(json!({"id": id, "title": title, "content": content}))
    }).map_err(|e| format!("Failed to query notes from database: {}", e))?;

    let mut notes = Vec::new();
    for note_result in note_iter {
        notes.push(note_result.map_err(|e| format!("Failed to retrieve note: {}", e))?);
    }
    let json_string = serde_json::to_string(&notes).map_err(|e| format!("Failed to serialize notes to JSON: {}", e))?;
    Ok(json_string)
}


#[tauri::command]
fn update_note(id: i32, title: String, content: String) -> Result<(), String> {
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute(
        "UPDATE notes SET title = ?1, content = ?2 WHERE id = ?3",
        params![title, content, id],
    ).map_err(|e| format!("Failed to update note in database: {}", e))?;
    Ok(())
} 

#[tauri::command]
fn delete_note(id: i32) -> Result<(), String> {
    let conn = Connection::open("notes.db").map_err(|e| format!("Failed to open database: {}", e))?;
    conn.execute("DELETE FROM notes WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete note from database: {}", e))?;
    Ok(())
}

fn main() {
    init_db().expect("Failed to initialize database");
    
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_note, read_note, update_note, delete_note])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
