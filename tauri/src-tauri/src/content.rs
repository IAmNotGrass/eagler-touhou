//! The app's own origin, `eagler://localhost` (`http://eagler.localhost` on
//! Windows and Android). It serves the bundled launcher pages, and the game
//! content the website publishes (game programs, their manifest and music)
//! from the content site, keeping a copy on disk so a game downloads once and
//! later plays offline. Both share one origin, as the launcher requires of the
//! games it starts.

use std::path::{Component, Path, PathBuf};

use tauri::http::{header, Request, Response, StatusCode};
use tauri::{AppHandle, Manager, Runtime};

pub const SCHEME: &str = "eagler";

/// The site the game content comes from; a build may name another.
pub const CONTENT_ORIGIN: &str = match option_env!("EAGLER_APP_CONTENT_ORIGIN") {
    Some(origin) => origin,
    None => "https://touhou.vip",
};

/// Where the app's pages live, as the webview addresses this scheme.
pub fn app_url() -> &'static str {
    if cfg!(any(windows, target_os = "android")) {
        "http://eagler.localhost/"
    } else {
        "eagler://localhost/"
    }
}

/// Game content the content site publishes: everything else is bundled.
fn from_content_site(path: &str) -> bool {
    path == "runtime-manifest.json" || path.starts_with("runtime/") || path.starts_with("games/")
}

/// Manifests change; everything else published there is named by its
/// content or never changes, so a stored copy is always current.
fn changes(path: &str) -> bool {
    path.ends_with(".json")
}

pub async fn serve<R: Runtime>(app: AppHandle<R>, client: reqwest::Client, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
    let Some(path) = request_path(request.uri().path()) else {
        return status(StatusCode::BAD_REQUEST);
    };
    if *request.method() != tauri::http::Method::GET && *request.method() != tauri::http::Method::HEAD {
        return status(StatusCode::METHOD_NOT_ALLOWED);
    }
    if !from_content_site(&path) {
        return bundled(&app, &path);
    }
    let Ok(cache_root) = app.path().app_cache_dir() else {
        return status(StatusCode::INTERNAL_SERVER_ERROR);
    };
    let cached = cache_root.join("content").join(&path);
    let range = request.headers().get(header::RANGE).and_then(|value| value.to_str().ok()).map(str::to_owned);
    if !changes(&path) {
        if let Some(bytes) = read(&cached).await {
            return content(&path, bytes, range.as_deref());
        }
    }
    let url = match request.uri().query() {
        Some(query) => format!("{CONTENT_ORIGIN}/{path}?{query}"),
        None => format!("{CONTENT_ORIGIN}/{path}"),
    };
    match fetch(&client, &url).await {
        Ok(Some(bytes)) => {
            store(cached, bytes.clone()).await;
            content(&path, bytes, range.as_deref())
        }
        Ok(None) => status(StatusCode::NOT_FOUND),
        // Offline: a manifest seen before still lets downloaded games start.
        Err(_) => match read(&cached).await {
            Some(bytes) => content(&path, bytes, range.as_deref()),
            None => status(StatusCode::BAD_GATEWAY),
        },
    }
}

/// The request path without its leading slash, or None if it tries to leave
/// the served tree.
fn request_path(raw: &str) -> Option<String> {
    let decoded = percent_decode(raw.trim_start_matches('/'))?;
    let path = if decoded.is_empty() { "index.html".to_owned() } else { decoded };
    let safe = Path::new(&path).components().all(|component| matches!(component, Component::Normal(_)));
    safe.then_some(path)
}

fn percent_decode(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut index = 0;
    while index < bytes.len() {
        if bytes[index] == b'%' {
            let hex = std::str::from_utf8(bytes.get(index + 1..index + 3)?).ok()?;
            out.push(u8::from_str_radix(hex, 16).ok()?);
            index += 3;
        } else {
            out.push(bytes[index]);
            index += 1;
        }
    }
    String::from_utf8(out).ok()
}

/// A bundled page or asset. Addresses of the launcher's client routes (user
/// pages, sign-in) get their single-page documents.
fn bundled<R: Runtime>(app: &AppHandle<R>, path: &str) -> Response<Vec<u8>> {
    let last = path.rsplit('/').next().unwrap_or(path);
    let document = if last.contains('.') {
        path
    } else if path.starts_with("user/") {
        "user.html"
    } else {
        "index.html"
    };
    match app.asset_resolver().get(document.to_owned()) {
        Some(asset) => Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, asset.mime_type)
            .header(header::CACHE_CONTROL, "no-cache")
            .body(asset.bytes)
            .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR)),
        None => status(StatusCode::NOT_FOUND),
    }
}

/// The content site's copy: Some(bytes), None when it has no such file, or
/// an error when it cannot be reached.
async fn fetch(client: &reqwest::Client, url: &str) -> Result<Option<Vec<u8>>, reqwest::Error> {
    let response = client.get(url).send().await?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }
    let response = response.error_for_status()?;
    Ok(Some(response.bytes().await?.to_vec()))
}

async fn read(path: &Path) -> Option<Vec<u8>> {
    let path = path.to_owned();
    tauri::async_runtime::spawn_blocking(move || std::fs::read(path).ok()).await.ok().flatten()
}

/// Keeps a copy, written whole and then moved into place so a partial file is
/// never served.
async fn store(path: PathBuf, bytes: Vec<u8>) {
    let _ = tauri::async_runtime::spawn_blocking(move || -> std::io::Result<()> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let partial = path.with_extension("partial");
        std::fs::write(&partial, bytes)?;
        std::fs::rename(partial, path)
    })
    .await;
}

fn content(path: &str, bytes: Vec<u8>, range: Option<&str>) -> Response<Vec<u8>> {
    let builder = Response::builder()
        .header(header::CONTENT_TYPE, mime_type(path))
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CACHE_CONTROL, if changes(path) { "no-cache" } else { "max-age=31536000, immutable" });
    // Media elements may ask for one byte range.
    if let Some((start, end)) = range.and_then(|value| byte_range(value, bytes.len())) {
        let total = bytes.len();
        return builder
            .status(StatusCode::PARTIAL_CONTENT)
            .header(header::CONTENT_RANGE, format!("bytes {start}-{end}/{total}"))
            .body(bytes[start..=end].to_vec())
            .unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR));
    }
    builder.status(StatusCode::OK).body(bytes).unwrap_or_else(|_| status(StatusCode::INTERNAL_SERVER_ERROR))
}

/// The first range of a `bytes=start-end` header, clamped to the file.
fn byte_range(value: &str, length: usize) -> Option<(usize, usize)> {
    if length == 0 {
        return None;
    }
    let spec = value.strip_prefix("bytes=")?.split(',').next()?.trim();
    let (start, end) = spec.split_once('-')?;
    let last = length - 1;
    let (start, end) = match (start.parse::<usize>().ok(), end.parse::<usize>().ok()) {
        (Some(start), Some(end)) => (start, end.min(last)),
        (Some(start), None) => (start, last),
        (None, Some(suffix)) if suffix > 0 => (length.saturating_sub(suffix), last),
        _ => return None,
    };
    (start <= end).then_some((start, end))
}

fn mime_type(path: &str) -> &'static str {
    match path.rsplit('.').next().unwrap_or("") {
        "html" => "text/html; charset=utf-8",
        "js" | "mjs" => "text/javascript; charset=utf-8",
        "wasm" => "application/wasm",
        "json" => "application/json; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "ogg" => "audio/ogg",
        "mp3" => "audio/mpeg",
        "mid" | "midi" => "audio/midi",
        "png" => "image/png",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "woff2" => "font/woff2",
        "txt" => "text/plain; charset=utf-8",
        _ => "application/octet-stream",
    }
}

fn status(code: StatusCode) -> Response<Vec<u8>> {
    Response::builder().status(code).body(Vec::new()).expect("an empty response")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paths_stay_inside_the_served_tree() {
        assert_eq!(request_path("/").as_deref(), Some("index.html"));
        assert_eq!(request_path("/runtime/th06/a/th06.wasm").as_deref(), Some("runtime/th06/a/th06.wasm"));
        assert_eq!(request_path("/games/th06/music/ogg/th06%5F01.ogg").as_deref(), Some("games/th06/music/ogg/th06_01.ogg"));
        assert_eq!(request_path("/../secret"), None);
        assert_eq!(request_path("/runtime/%2e%2e/x"), None);
        assert_eq!(request_path("/a/%zz"), None);
    }

    #[test]
    fn game_content_comes_from_the_content_site() {
        assert!(from_content_site("runtime-manifest.json"));
        assert!(from_content_site("runtime/th06/8a86/th06.html"));
        assert!(from_content_site("games/th06/music/ogg/th06_01.ogg"));
        assert!(!from_content_site("site-manifest.json"));
        assert!(!from_content_site("assets/th06-card.webp"));
        assert!(changes("runtime-manifest.json") && !changes("runtime/th06/8a86/th06.wasm"));
    }

    #[test]
    fn byte_ranges() {
        assert_eq!(byte_range("bytes=0-99", 1000), Some((0, 99)));
        assert_eq!(byte_range("bytes=900-", 1000), Some((900, 999)));
        assert_eq!(byte_range("bytes=-100", 1000), Some((900, 999)));
        assert_eq!(byte_range("bytes=0-5000", 1000), Some((0, 999)));
        assert_eq!(byte_range("bytes=1200-1300", 1000), None);
        assert_eq!(byte_range("items=0-1", 1000), None);
    }
}
