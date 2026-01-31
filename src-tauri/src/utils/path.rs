pub fn sanitize_filename(title: &str) -> String {
    title.replace(
        &['/', '\\', '?', '%', '*', ':', '|', '"', '<', '>'][..],
        "_",
    )
}
