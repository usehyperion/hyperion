use std::fmt;
use std::fmt::Write;

use rustc_hash::{FxBuildHasher, FxHashMap};

fn decode_tag_value(raw: &str) -> String {
    if !raw.contains('\\') {
        return raw.to_owned();
    }

    let mut output = String::with_capacity(raw.len());
    let mut iter = raw.chars();

    while let Some(c) = iter.next() {
        if c == '\\' {
            match iter.next() {
                Some(':') => output.push(';'),
                Some('s') => output.push(' '),
                Some('\\') => output.push('\\'),
                Some('r') => output.push('\r'),
                Some('n') => output.push('\n'),
                // Unknown escapes drop the backslash, a dangling one is dropped
                Some(c) => output.push(c),
                None => {}
            }
        } else {
            output.push(c);
        }
    }

    output
}

fn encode_tag_value(raw: &str) -> String {
    if !raw.contains([';', ' ', '\\', '\r', '\n']) {
        return raw.to_owned();
    }

    let mut output = String::with_capacity((raw.len() as f64 * 1.2) as usize);

    for c in raw.chars() {
        match c {
            ';' => output.push_str("\\:"),
            ' ' => output.push_str("\\s"),
            '\\' => output.push_str("\\\\"),
            '\r' => output.push_str("\\r"),
            '\n' => output.push_str("\\n"),
            c => output.push(c),
        };
    }

    output
}

#[derive(Debug, Clone, Default)]
pub struct IrcTags(pub FxHashMap<String, String>);

impl IrcTags {
    pub fn parse(source: &str) -> IrcTags {
        let tag_count = source.as_bytes().iter().filter(|&&b| b == b';').count() + 1;
        let mut tags = IrcTags(FxHashMap::with_capacity_and_hasher(
            tag_count,
            FxBuildHasher,
        ));

        for raw_tag in source.split(';') {
            let mut tag_split = raw_tag.splitn(2, '=');

            let key = tag_split.next().unwrap();
            let value = tag_split
                .next()
                .map_or_else(|| "".to_owned(), decode_tag_value);

            tags.0.insert(key.to_owned(), value);
        }

        tags
    }
}

impl fmt::Display for IrcTags {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let mut add_separator = false;

        for (key, value) in self.0.iter() {
            if add_separator {
                f.write_char(';')?;
            } else {
                add_separator = true;
            }

            f.write_str(key)?;

            if !value.is_empty() {
                f.write_char('=')?;
                f.write_str(&encode_tag_value(value))?;
            }
        }

        Ok(())
    }
}
