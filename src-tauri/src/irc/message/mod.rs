pub(crate) mod commands;
pub(crate) mod prefix;
pub(crate) mod tags;
pub(crate) mod twitch;

use std::fmt;
use std::fmt::Write;

pub use commands::*;
use prefix::IrcPrefix;
use serde::{Deserialize, Serialize};
pub use tags::IrcTags;
use thiserror::Error;
pub use twitch::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Error)]
pub enum IrcParseError {
    #[error("No space found after tags (no command/prefix)")]
    NoSpaceAfterTags,
    #[error("No tags after @ sign")]
    EmptyTagsDeclaration,
    #[error("No space found after prefix (no command)")]
    NoSpaceAfterPrefix,
    #[error("No tags after : sign")]
    EmptyPrefixDeclaration,
    #[error("Expected command to only consist of alphabetic or numeric characters")]
    MalformedCommand,
    #[error("Expected only single spaces between middle parameters")]
    TooManySpacesInMiddleParams,
    #[error("Newlines are not permitted in raw IRC messages")]
    NewlinesInMessage,
}

pub trait AsRawIrc {
    fn format_as_raw_irc(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result;
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct IrcMessage {
    pub tags: IrcTags,
    pub prefix: Option<IrcPrefix>,
    pub command: String,
    pub params: Vec<String>,
}

#[macro_export]
macro_rules! irc {
    (@replace_expr $_t:tt $sub:expr) => {
        $sub
    };
    (@count_exprs $($expression:expr),*) => {
        0usize $(+ irc!(@replace_expr $expression 1usize))*
    };
    ($command:expr $(, $argument:expr )* ) => {
        {
            let capacity = irc!(@count_exprs $($argument),*);
            #[allow(unused_mut)]
            let mut temp_vec: ::std::vec::Vec<String> = ::std::vec::Vec::with_capacity(capacity);
            $(
                temp_vec.push(::std::string::String::from($argument));
            )*
            $crate::irc::message::IrcMessage::new(::std::string::String::from($command), temp_vec)
        }
    };
}

impl IrcMessage {
    pub fn new(command: String, params: Vec<String>) -> IrcMessage {
        IrcMessage {
            tags: IrcTags::new(),
            prefix: None,
            command,
            params,
        }
    }

    pub fn parse(mut source: &str) -> Result<IrcMessage, IrcParseError> {
        if source.contains(['\r', '\n']) {
            return Err(IrcParseError::NewlinesInMessage);
        }

        let tags = if source.starts_with('@') {
            let (tags_part, remainder) = source[1..]
                .split_once(' ')
                .ok_or(IrcParseError::NoSpaceAfterTags)?;
            source = remainder;

            if tags_part.is_empty() {
                return Err(IrcParseError::EmptyTagsDeclaration);
            }

            IrcTags::parse(tags_part)
        } else {
            IrcTags::new()
        };

        let prefix = if source.starts_with(':') {
            let (prefix_part, remainder) = source[1..]
                .split_once(' ')
                .ok_or(IrcParseError::NoSpaceAfterPrefix)?;
            source = remainder;

            if prefix_part.is_empty() {
                return Err(IrcParseError::EmptyPrefixDeclaration);
            }

            Some(IrcPrefix::parse(prefix_part))
        } else {
            None
        };

        let mut command_split = source.splitn(2, ' ');
        let mut command = command_split.next().unwrap().to_owned();
        command.make_ascii_uppercase();

        if command.is_empty()
            || !command.chars().all(|c| c.is_ascii_alphabetic())
                && !command.chars().all(|c| c.is_ascii() && c.is_numeric())
        {
            return Err(IrcParseError::MalformedCommand);
        }

        let mut params;
        if let Some(params_part) = command_split.next() {
            params = vec![];

            let mut rest = Some(params_part);
            while let Some(rest_str) = rest {
                if let Some(sub_str) = rest_str.strip_prefix(':') {
                    params.push(sub_str.to_owned());
                    rest = None;
                } else {
                    let mut split = rest_str.splitn(2, ' ');
                    let param = split.next().unwrap();
                    rest = split.next();

                    if param.is_empty() {
                        return Err(IrcParseError::TooManySpacesInMiddleParams);
                    }
                    params.push(param.to_owned());
                }
            }
        } else {
            params = vec![];
        };

        Ok(IrcMessage {
            tags,
            prefix,
            command,
            params,
        })
    }
}

impl fmt::Display for IrcMessage {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.format_as_raw_irc(f)
    }
}

impl AsRawIrc for IrcMessage {
    fn format_as_raw_irc(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        if !self.tags.0.is_empty() {
            f.write_char('@')?;
            self.tags.format_as_raw_irc(f)?;
            f.write_char(' ')?;
        }

        if let Some(prefix) = &self.prefix {
            f.write_char(':')?;
            prefix.format_as_raw_irc(f)?;
            f.write_char(' ')?;
        }

        f.write_str(&self.command)?;

        for param in self.params.iter() {
            if !param.contains(' ') && !param.is_empty() && !param.starts_with(':') {
                write!(f, " {param}")?;
            } else {
                write!(f, " :{param}")?;
                // TODO should there be a panic if this is not the last parameter?
                break;
            }
        }

        Ok(())
    }
}
