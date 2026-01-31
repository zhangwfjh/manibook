use rusqlite;

pub fn handle_query_result<T>(
    result: Result<T, rusqlite::Error>,
    not_found_message: &str,
) -> Result<T, String> {
    match result {
        Ok(value) => Ok(value),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(not_found_message.to_string()),
        Err(e) => Err(format!("Database error: {}", e)),
    }
}
