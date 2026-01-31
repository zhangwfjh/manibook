use crate::services::database::open_database;
use lazy_static::lazy_static;
use std::sync::Mutex;

lazy_static! {
    static ref GLOBAL_STATE: Mutex<GlobalState> = Mutex::new(GlobalState {
        current_library: None,
        library_path: None,
        conn: None,
    });
}

struct GlobalState {
    current_library: Option<String>,
    library_path: Option<String>,
    conn: Option<rusqlite::Connection>,
}

pub fn open_library(library_name: String, library_path: String) -> Result<(), String> {
    let mut state = GLOBAL_STATE
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if state.current_library.as_ref() != Some(&library_name) {
        close_internal(&mut state);
    }

    let conn = open_database(&library_path)?;
    state.current_library = Some(library_name);
    state.library_path = Some(library_path);
    state.conn = Some(conn);

    Ok(())
}

#[tauri::command]
pub fn close_library() -> Result<(), String> {
    let mut state = GLOBAL_STATE
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    close_internal(&mut state);
    Ok(())
}

#[tauri::command]
pub fn is_library_open() -> Option<String> {
    GLOBAL_STATE.lock().ok()?.current_library.clone()
}

pub fn get_library_path() -> Result<String, String> {
    let state = GLOBAL_STATE
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    state
        .library_path
        .clone()
        .ok_or_else(|| "No library open. Call open_library() first.".to_string())
}

fn close_internal(state: &mut GlobalState) {
    state.current_library = None;
    state.library_path = None;
    state.conn = None;
}

pub fn with_connection<F, R>(f: F) -> Result<R, String>
where
    F: FnOnce(&rusqlite::Connection) -> Result<R, String>,
{
    let state = GLOBAL_STATE
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    let conn = state
        .conn
        .as_ref()
        .ok_or_else(|| "No library open. Call open_library() first.".to_string())?;
    f(conn)
}
