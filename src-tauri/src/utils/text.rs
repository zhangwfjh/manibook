use crate::models::Metadata;

pub fn to_proper_title_case(s: &str) -> String {
    if s.is_empty() {
        return s.to_string();
    }

    let small_words: std::collections::HashSet<&str> = [
        "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "by", "in", "of",
    ]
    .into();

    s.to_lowercase()
        .split_whitespace()
        .enumerate()
        .map(|(index, word)| {
            let is_first_or_last = index == 0 || index == s.split_whitespace().count() - 1;
            let is_small_word = small_words.contains(word);
            let is_hyphenated = word.contains('-');

            if is_hyphenated {
                word.split('-')
                    .enumerate()
                    .map(|(i, part)| {
                        let parts: Vec<&str> = word.split('-').collect();
                        let is_first_or_last_part = i == 0 || i == parts.len() - 1;
                        let is_small_part = small_words.contains(part);

                        if is_first_or_last_part || !is_small_part {
                            if let Some(first_char) = part.chars().next() {
                                let rest = part.chars().skip(1).collect::<String>();
                                first_char.to_uppercase().collect::<String>() + &rest
                            } else {
                                part.to_string()
                            }
                        } else {
                            part.to_string()
                        }
                    })
                    .collect::<Vec<String>>()
                    .join("-")
            } else if is_first_or_last || !is_small_word {
                if let Some(first_char) = word.chars().next() {
                    let rest = word.chars().skip(1).collect::<String>();
                    first_char.to_uppercase().collect::<String>() + &rest
                } else {
                    word.to_string()
                }
            } else {
                word.to_string()
            }
        })
        .collect::<Vec<String>>()
        .join(" ")
}

pub fn normalize_metadata(mut metadata: Metadata) -> Metadata {
    metadata.doctype = to_proper_title_case(&metadata.doctype);
    metadata.title = to_proper_title_case(&metadata.title);
    metadata.authors = metadata
        .authors
        .into_iter()
        .map(|author| to_proper_title_case(&author))
        .collect();
    if let Some(publisher) = metadata.publisher {
        metadata.publisher = Some(to_proper_title_case(&publisher));
    }
    metadata.category = metadata
        .category
        .split(" > ")
        .map(|part| to_proper_title_case(part.trim()))
        .collect::<Vec<String>>()
        .join(" > ");
    metadata.language = to_proper_title_case(&metadata.language);
    metadata.keywords = metadata
        .keywords
        .into_iter()
        .map(|keyword| to_proper_title_case(&keyword))
        .collect();
    metadata
}
