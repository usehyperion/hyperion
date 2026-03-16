use std::collections::HashMap;
use std::collections::hash_map::RandomState;
use std::fmt;
use std::fmt::Write;

use serde::{Deserialize, Serialize};

use super::AsRawIrc;

fn decode_tag_value(raw: &str) -> String {
    if !raw.contains('\\') {
        return raw.to_owned();
    }

    let mut output = String::with_capacity(raw.len());
    let mut iter = raw.chars();

    while let Some(c) = iter.next() {
        if c == '\\' {
            match iter.next() {
                Some(':') => output.push(';'),   // \: escapes to ;
                Some('s') => output.push(' '),   // \s decodes to a space
                Some('\\') => output.push('\\'), // \\ decodes to \
                Some('r') => output.push('\r'),  // \r decodes to CR
                Some('n') => output.push('\n'),  // \n decodes to LF
                Some(c) => output.push(c),       // E.g. a\bc escapes to abc
                None => {}                       // Dangling \ at the end of the string
            }
        } else {
            // No escape sequence here
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

#[derive(Debug, PartialEq, Eq, Clone, Default, Serialize, Deserialize)]
pub struct IrcTags(pub HashMap<String, String>);

impl IrcTags {
    /// Creates a new empty map of tags.
    pub fn new() -> IrcTags {
        IrcTags(HashMap::new())
    }

    /// Panics if `source` is an empty string.
    pub fn parse(source: &str) -> IrcTags {
        if source.is_empty() {
            panic!("invalid input")
        }

        let tag_count = source.as_bytes().iter().filter(|&&b| b == b';').count() + 1;
        let mut tags = IrcTags(HashMap::with_capacity(tag_count));

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

impl From<HashMap<String, String>> for IrcTags {
    fn from(map: HashMap<String, String, RandomState>) -> Self {
        IrcTags(map)
    }
}

impl AsRawIrc for IrcTags {
    fn format_as_raw_irc(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
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

impl PartialEq<HashMap<String, String>> for IrcTags {
    fn eq(&self, other: &HashMap<String, String, RandomState>) -> bool {
        &self.0 == other
    }
}

impl PartialEq<IrcTags> for HashMap<String, String> {
    fn eq(&self, other: &IrcTags) -> bool {
        self == &other.0
    }
}
