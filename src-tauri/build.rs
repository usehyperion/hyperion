fn emit_commit_hash() {
    // Rebuild when the checked out commit changes
    println!("cargo:rerun-if-changed=../.git/HEAD");
    println!("cargo:rerun-if-changed=../.git/refs");

    let output = std::process::Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output();

    let Ok(output) = output else { return };

    if !output.status.success() {
        return;
    }

    let hash = String::from_utf8_lossy(&output.stdout);

    println!("cargo:rustc-env=HYPERION_COMMIT={}", hash.trim());
}

fn main() {
    emit_commit_hash();

    tauri_build::build()
}
