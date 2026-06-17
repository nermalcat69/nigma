use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::Path;

// ─── Document type (mirrors TypeScript NigmaDocument) ────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NigmaDocument {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
    pub pages: Vec<serde_json::Value>,
    pub components: Vec<serde_json::Value>,
    pub styles: Vec<serde_json::Value>,
    #[serde(rename = "filePath", skip_serializing_if = "Option::is_none")]
    pub file_path: Option<String>,
}

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Open a .nigma file (ZIP archive containing document.json) or plain JSON.
#[tauri::command]
async fn open_document(path: String) -> Result<NigmaDocument, String> {
    // Try ZIP first (the canonical .nigma format)
    if let Ok(file) = fs::File::open(&path) {
        if let Ok(mut archive) = zip::ZipArchive::new(file) {
            if let Ok(mut entry) = archive.by_name("document.json") {
                let mut contents = String::new();
                entry
                    .read_to_string(&mut contents)
                    .map_err(|e| format!("Failed to read document.json from archive: {e}"))?;
                let mut doc: NigmaDocument = serde_json::from_str(&contents)
                    .map_err(|e| format!("Failed to parse document: {e}"))?;
                doc.file_path = Some(path);
                return Ok(doc);
            }
        }
    }

    // Fall back to plain JSON (legacy / debug files)
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {e}"))?;
    let mut doc: NigmaDocument = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse document: {e}"))?;
    doc.file_path = Some(path);
    Ok(doc)
}

/// Save a document as a .nigma ZIP archive containing document.json.
#[tauri::command]
async fn save_document(path: String, document: NigmaDocument) -> Result<(), String> {
    let json = serde_json::to_string_pretty(&document)
        .map_err(|e| format!("Failed to serialize document: {e}"))?;

    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directory: {e}"))?;
    }

    let file = fs::File::create(&path)
        .map_err(|e| format!("Failed to create file: {e}"))?;

    let mut zip = zip::ZipWriter::new(file);
    let options =
        zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("document.json", options)
        .map_err(|e| format!("Failed to start ZIP entry: {e}"))?;
    zip.write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write ZIP entry: {e}"))?;
    zip.finish()
        .map_err(|e| format!("Failed to finalize ZIP: {e}"))?;

    Ok(())
}

/// Export raw PNG base64 data to a file.
#[tauri::command]
async fn export_png(path: String, data: String) -> Result<(), String> {
    let bytes = base64_decode(&data)
        .map_err(|e| format!("Failed to decode base64: {e}"))?;

    let mut file = fs::File::create(&path)
        .map_err(|e| format!("Failed to create file: {e}"))?;

    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write PNG: {e}"))?;

    Ok(())
}

/// Export SVG string to a file.
#[tauri::command]
async fn export_svg(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write SVG: {e}"))?;
    Ok(())
}

/// Read clipboard text content.
#[tauri::command]
async fn read_clipboard(app: tauri::AppHandle) -> Result<String, String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard()
        .read_text()
        .map_err(|e| format!("Clipboard error: {e}"))
}

/// Get document metadata (name, path) for recent files list.
#[tauri::command]
async fn get_document_info(path: String) -> Result<serde_json::Value, String> {
    // Try ZIP first
    if let Ok(file) = fs::File::open(&path) {
        if let Ok(mut archive) = zip::ZipArchive::new(file) {
            if let Ok(mut entry) = archive.by_name("document.json") {
                let mut contents = String::new();
                if entry.read_to_string(&mut contents).is_ok() {
                    if let Ok(doc) = serde_json::from_str::<serde_json::Value>(&contents) {
                        return Ok(serde_json::json!({
                            "name": doc["name"],
                            "id":   doc["id"],
                            "updatedAt": doc["updatedAt"],
                            "path": path,
                        }));
                    }
                }
            }
        }
    }

    // Fall back to plain JSON
    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {e}"))?;
    let doc: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse: {e}"))?;
    Ok(serde_json::json!({
        "name": doc["name"],
        "id":   doc["id"],
        "updatedAt": doc["updatedAt"],
        "path": path,
    }))
}

// ─── App entry ────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            open_document,
            save_document,
            export_png,
            export_svg,
            read_clipboard,
            get_document_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running nigma");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn base64_decode(input: &str) -> Result<Vec<u8>, String> {
    use std::collections::HashMap;

    const CHARS: &[u8] =
        b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut table: HashMap<u8, u8> = HashMap::new();
    for (i, &c) in CHARS.iter().enumerate() {
        table.insert(c, i as u8);
    }

    let input: Vec<u8> = input.bytes().filter(|&b| b != b'=').collect();
    let mut output = Vec::with_capacity(input.len() * 3 / 4);

    for chunk in input.chunks(4) {
        let vals: Vec<u8> = chunk.iter().map(|b| *table.get(b).unwrap_or(&0)).collect();
        if vals.len() >= 2 {
            output.push((vals[0] << 2) | (vals[1] >> 4));
        }
        if vals.len() >= 3 {
            output.push((vals[1] << 4) | (vals[2] >> 2));
        }
        if vals.len() >= 4 {
            output.push((vals[2] << 6) | vals[3]);
        }
    }

    Ok(output)
}
