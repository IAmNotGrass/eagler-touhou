/// The app is the website's launcher loaded from bundled files at its own
/// origin, which also serves the game content the website publishes (see
/// `content`). The page does almost everything itself; the shell adds the
/// system-browser opener for links to other sites and keeps the account's
/// sign-in token in the system's credential store (Windows Credential Manager,
/// macOS Keychain, the Secret Service on Linux).
mod account_token {
    #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
    mod store {
        const SERVICE: &str = "top.lograss.eaglertouhou";
        const ENTRY: &str = "account-session";

        fn entry() -> Result<keyring::Entry, String> {
            keyring::Entry::new(SERVICE, ENTRY).map_err(|error| error.to_string())
        }

        pub fn read() -> Result<Option<String>, String> {
            match entry()?.get_password() {
                Ok(token) => Ok(Some(token)),
                Err(keyring::Error::NoEntry) => Ok(None),
                Err(error) => Err(error.to_string()),
            }
        }

        pub fn write(token: Option<String>) -> Result<(), String> {
            let entry = entry()?;
            match token {
                Some(token) => entry.set_password(&token).map_err(|error| error.to_string()),
                None => match entry.delete_credential() {
                    Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
                    Err(error) => Err(error.to_string()),
                },
            }
        }
    }

    // Elsewhere (Android) there is no credential store here; the page keeps
    // the token in the app's private storage instead.
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    mod store {
        pub fn read() -> Result<Option<String>, String> {
            Err("no credential store".into())
        }
        pub fn write(_token: Option<String>) -> Result<(), String> {
            Err("no credential store".into())
        }
    }

    /// The stored sign-in token, if any. Credential stores may block, so the
    /// call runs off the main thread.
    #[tauri::command]
    pub async fn account_token_get() -> Result<Option<String>, String> {
        tauri::async_runtime::spawn_blocking(store::read).await.map_err(|error| error.to_string())?
    }

    /// Stores the sign-in token, or forgets it for `None`.
    #[tauri::command]
    pub async fn account_token_set(token: Option<String>) -> Result<(), String> {
        tauri::async_runtime::spawn_blocking(move || store::write(token)).await.map_err(|error| error.to_string())?
    }
}

mod content;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = reqwest::Client::builder()
        .user_agent(concat!("EaglerTouhouApp/", env!("CARGO_PKG_VERSION")))
        .connect_timeout(std::time::Duration::from_secs(15))
        .build()
        .expect("an HTTP client");
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .register_asynchronous_uri_scheme_protocol(content::SCHEME, move |context, request, responder| {
            let (app, client) = (context.app_handle().clone(), client.clone());
            tauri::async_runtime::spawn(async move { responder.respond(content::serve(app, client, request).await) });
        })
        .invoke_handler(tauri::generate_handler![account_token::account_token_get, account_token::account_token_set])
        .setup(|app| {
            let url = content::app_url().parse().expect("the app's address");
            tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::CustomProtocol(url))
                .title("东方Project 原作 STG ~ EAGLER TOUHOU")
                .inner_size(1440.0, 900.0)
                .min_inner_size(480.0, 560.0)
                .center()
                .background_color(tauri::window::Color(16, 16, 15, 255))
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the Eagler Touhou app");
}
