use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Library {
    pub name: String,
    pub path: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct LibrarySettings {
    pub libraries: Vec<Library>,
    #[serde(default)]
    pub default_library: Option<String>,
}
