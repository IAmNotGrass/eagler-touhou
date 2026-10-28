/// The app is the website's launcher loaded from bundled files. The page
/// itself handles everything; the shell only adds the system-browser opener
/// for links to other sites.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running the Eagler Touhou app");
}
