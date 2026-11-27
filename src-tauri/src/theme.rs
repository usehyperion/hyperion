//! Serves custom themes over the `theme://` protocol.

use std::fs;
use std::path::{Path, PathBuf};

use percent_encoding::percent_decode_str;
use tauri::http::{Request, Response, StatusCode, header};
use tauri::{AppHandle, Manager, Runtime, UriSchemeContext, UriSchemeResponder};

pub const SCHEME: &str = "theme";

/// Generous for fonts and images. Small enough that a stray file can't stall
/// the webview.
const MAX_FILE_SIZE: u64 = 16 * 1024 * 1024;

pub fn handle<R: Runtime>(
    ctx: UriSchemeContext<'_, R>,
    request: Request<Vec<u8>>,
    responder: UriSchemeResponder,
) {
    let app = ctx.app_handle().clone();
    let origin = webview_origin(&app, ctx.webview_label());
    let path = request.uri().path().to_owned();

    tauri::async_runtime::spawn_blocking(move || {
        let mut response = Response::builder().header(header::CACHE_CONTROL, "no-store");

        // Fonts are fetched in CORS mode, and the app's origin never matches
        // this scheme's.
        if let Some(origin) = &origin {
            response = response.header(header::ACCESS_CONTROL_ALLOW_ORIGIN, origin);
        }

        let response = match serve(&app, &path) {
            Ok((mime, bytes)) => response.header(header::CONTENT_TYPE, mime).body(bytes),
            Err(status) => {
                tracing::warn!(%path, %status, "Refused theme file request");
                response.status(status).body(Vec::new())
            }
        };

        match response {
            Ok(response) => responder.respond(response),
            Err(error) => tracing::error!(%error, "Failed to build theme file response"),
        }
    });
}

fn serve<R: Runtime>(
    app: &AppHandle<R>,
    path: &str,
) -> Result<(&'static str, Vec<u8>), StatusCode> {
    let mut segments = path.strip_prefix('/').unwrap_or(path).split('/');

    segments
        .next()
        .filter(|revision| !revision.is_empty())
        .ok_or(StatusCode::NOT_FOUND)?;

    let id = decode(segments.next().ok_or(StatusCode::NOT_FOUND)?)?;

    if !is_theme_id(&id) {
        return Err(StatusCode::FORBIDDEN);
    }

    let mut relative = PathBuf::new();

    for segment in segments {
        let segment = decode(segment)?;

        if !is_safe_segment(&segment) {
            return Err(StatusCode::FORBIDDEN);
        }

        relative.push(segment);
    }

    let mime = mime_type(&relative).ok_or(StatusCode::FORBIDDEN)?;

    let themes_dir = app
        .path()
        .app_config_dir()
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .join("themes");

    let file = resolve(&themes_dir.join(id), &relative)?;
    let bytes = fs::read(file).map_err(|_| StatusCode::NOT_FOUND)?;

    Ok((mime, bytes))
}

/// Walks from the theme folder to the file, refusing symlinks at every step so
/// nothing outside the folder can be reached.
fn resolve(theme_dir: &Path, relative: &Path) -> Result<PathBuf, StatusCode> {
    let mut current = theme_dir.to_path_buf();
    let mut components = relative.components().peekable();

    check_entry(&current, Entry::Dir)?;

    while let Some(component) = components.next() {
        current.push(component);

        let entry = if components.peek().is_some() {
            Entry::Dir
        } else {
            Entry::File
        };
        check_entry(&current, entry)?;
    }

    Ok(current)
}

enum Entry {
    Dir,
    File,
}

fn check_entry(path: &Path, expected: Entry) -> Result<(), StatusCode> {
    let metadata = fs::symlink_metadata(path).map_err(|_| StatusCode::NOT_FOUND)?;
    let file_type = metadata.file_type();

    if file_type.is_symlink() {
        return Err(StatusCode::FORBIDDEN);
    }

    match expected {
        Entry::Dir if file_type.is_dir() => Ok(()),
        Entry::File if file_type.is_file() && metadata.len() <= MAX_FILE_SIZE => Ok(()),
        Entry::File if file_type.is_file() => Err(StatusCode::PAYLOAD_TOO_LARGE),
        _ => Err(StatusCode::NOT_FOUND),
    }
}

fn decode(segment: &str) -> Result<String, StatusCode> {
    percent_decode_str(segment)
        .decode_utf8()
        .map(|decoded| decoded.into_owned())
        .map_err(|_| StatusCode::BAD_REQUEST)
}

/// Matches `ID_REGEX` in `themes.ts`
fn is_theme_id(id: &str) -> bool {
    let is_edge = |c: char| c.is_ascii_alphanumeric();
    let is_inner = |c: char| c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-');

    (1..=64).contains(&id.len())
        && id.starts_with(is_edge)
        && id.ends_with(is_edge)
        && id.chars().all(is_inner)
}

/// Rejects empty segments, `.`, `..`, dotfiles, and anything that could mean a
/// separator, drive, or stream on some platform.
fn is_safe_segment(segment: &str) -> bool {
    !segment.is_empty() && !segment.starts_with('.') && !segment.contains(['/', '\\', ':', '\0'])
}

fn mime_type(path: &Path) -> Option<&'static str> {
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();

    let mime = match extension.as_str() {
        "css" => "text/css; charset=utf-8",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "avif" => "image/avif",
        "ico" => "image/x-icon",
        "woff2" => "font/woff2",
        "woff" => "font/woff",
        "ttf" => "font/ttf",
        "otf" => "font/otf",
        _ => return None,
    };

    Some(mime)
}

/// The origin of the page asking, written out by hand because `Url::origin`
/// treats `tauri://localhost` as opaque.
fn webview_origin<R: Runtime>(app: &AppHandle<R>, label: &str) -> Option<String> {
    let url = app.get_webview_window(label)?.url().ok()?;
    let host = url.host_str()?;

    Some(match url.port() {
        Some(port) => format!("{}://{host}:{port}", url.scheme()),
        None => format!("{}://{host}", url.scheme()),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TempDir(PathBuf);

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn theme_ids() {
        assert!(is_theme_id("windows-95"));
        assert!(is_theme_id("a"));
        assert!(!is_theme_id(""));
        assert!(!is_theme_id("-leading"));
        assert!(!is_theme_id("trailing."));
        assert!(!is_theme_id("has space"));
        assert!(!is_theme_id(&"a".repeat(65)));
    }

    #[test]
    fn segments() {
        assert!(is_safe_segment("main.css"));
        assert!(is_safe_segment("My Font.woff2"));
        assert!(!is_safe_segment(""));
        assert!(!is_safe_segment(".."));
        assert!(!is_safe_segment(".git"));
        assert!(!is_safe_segment("a\\b"));
        assert!(!is_safe_segment("C:"));
    }

    #[test]
    fn mime_types() {
        assert_eq!(mime_type(Path::new("fonts/a.WOFF2")), Some("font/woff2"));
        assert_eq!(
            mime_type(Path::new("main.css")),
            Some("text/css; charset=utf-8")
        );
        assert_eq!(mime_type(Path::new("manifest.json")), None);
        assert_eq!(mime_type(Path::new("README")), None);
    }

    #[test]
    fn resolves_inside_theme_only() {
        let temp = TempDir(
            std::env::temp_dir().join(format!("hyperion-theme-test-{}", std::process::id())),
        );

        let root = &temp.0;
        let theme = root.join("demo");

        fs::create_dir_all(theme.join("fonts")).unwrap();
        fs::write(theme.join("main.css"), "").unwrap();
        fs::write(theme.join("fonts/a.woff2"), "").unwrap();

        assert!(resolve(&theme, Path::new("main.css")).is_ok());
        assert!(resolve(&theme, Path::new("fonts/a.woff2")).is_ok());

        assert_eq!(
            resolve(&theme, Path::new("fonts")),
            Err(StatusCode::NOT_FOUND)
        );

        assert_eq!(
            resolve(&theme, Path::new("missing.css")),
            Err(StatusCode::NOT_FOUND)
        );

        #[cfg(unix)]
        {
            fs::write(root.join("outside.css"), "").unwrap();
            std::os::unix::fs::symlink(root.join("outside.css"), theme.join("link.css")).unwrap();

            assert_eq!(
                resolve(&theme, Path::new("link.css")),
                Err(StatusCode::FORBIDDEN)
            );
        }
    }
}
