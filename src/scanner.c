/*
 * Hey, future me. Yes, you, me. It's me, you.
 * I left a bunch of comments like this for you.
 * Just in case you forget what this beaUwUtiful pile of C code does.
 * No need to thank me, thank you.
 */

#include "tree_sitter/parser.h"

/*
 * This scanner handles two things:
 * 1. Comments that can be nested inside other comments
 * 2. Raw blocks where everything is literal (especially the template syntax)
 */

enum TokenType {
  NESTED_COMMENT,
  RAW_CONTENT,
};

/*
 * Factory functions for scanner lifecycle management
 *
 * These are called when a scanner needs to be created or destroyed.
 * Since we don't need any state, we just return NULL and ignore the
 * payload entirely.
 */

// Creates a new scanner. Or rather, doesn't. Thanks but no thanks
void *tree_sitter_askama_external_scanner_create() { return NULL; }

// Nothing to destroy, since nothing was created
void tree_sitter_askama_external_scanner_destroy(void *payload) {}

/*
 * Serialization functions
 *
 * These would save and restore the scanner's state, if we had one worth saving.
 * But we don't. So, they do nothing. Life's great.
 */

unsigned tree_sitter_askama_external_scanner_serialize(void *payload,
                                                       char *buffer) {
  return 0;
}

void tree_sitter_askama_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {}

// A small helper function that recognizes several flavors of whitespace
static inline bool is_space(int32_t c) {
  return c == ' ' || c == '\t' || c == '\n' || c == '\r';
}

/*
 * Nested comment scanner
 *
 * Our job here is to find matching comment delimiters.
 *
 * Each opening comment `{#` makes us go deeper.
 * Each closing comment `#}` makes us go back up.
 *
 * The `depth` counter tracks our current nesting level.
 */
static bool scan_nested_comment(TSLexer *lexer) {
  int depth = 1; // If we got here, we're already inside a comment

  while (lexer->lookahead != 0) {
    if (lexer->lookahead == '{') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '#') {
        depth++;
        lexer->advance(lexer, false);
      }
    } else if (lexer->lookahead == '#') {
      lexer->mark_end(lexer); // Each `#` could be our last endpoint
      lexer->advance(lexer, false);
      if (lexer->lookahead == '}') {
        depth--;
        lexer->advance(lexer, false);
        if (depth == 0) {
          return true; // There and back again
        }
      }
    } else {
      lexer->advance(lexer, false); // Keep going
    }
  }

  // If there's no text left to look ahead...
  // ...why is there still some comments to be closed?
  return false;
}

/*
 * is it endraw yet?
 *
 * Checks whether we're at the start of an `endraw_statement`.
 *
 * The clever bit is calling `lexer->mark_end()` at the start to remember where
 * we began. If we find what we're looking for, the lexer position gets reset to
 * that marked spot. So it can look ahead without actually consuming anything.
 */
static bool is_it_endraw_yet(TSLexer *lexer) {
  lexer->mark_end(lexer);

  // First, we look for `{%`
  if (lexer->lookahead != '{') {
    return false; // Nope, not starting with `{`
  }
  lexer->advance(lexer, false);

  if (lexer->lookahead != '%') {
    return false; // Sorry, I was looking for a `%`
  }
  lexer->advance(lexer, false);

  // Ok, we have `{%`

  // Check for Askama whitespace control characters: -, +, or ~
  // The `{%` fancy variants: {%-, {%+, {%~
  if (lexer->lookahead == '-' || lexer->lookahead == '+' ||
      lexer->lookahead == '~') {
    lexer->advance(lexer, false); // Found one, lol
  }

  // Skip any whitespace, both `{% endraw` and `{%    endraw` are valid
  while (is_space(lexer->lookahead)) {
    lexer->advance(lexer, false);
  }

  // Looking for the `endraw` keyword...
  const char *kw = "endraw";

  // ...letter by letter, pointer by pointer
  for (const char *p = kw; *p; p++) {
    if (lexer->lookahead != *p) {
      return false; // But no. So near, yet so far
    }
    lexer->advance(lexer, false); // Yes... Ha Ha Ha... Yes!
  }

  return true; // We found the `{% endraw` ...or at least one of its variants
}

/*
 * Raw content scanner
 *
 * We already have a `raw_statement`, now we are looking for the `raw_content`.
 *
 * The `advanced` flag tracks if we've consumed at least one character,
 * ensuring we don't return an empty token.
 */
static bool scan_raw_content(TSLexer *lexer) {
  bool advanced = false;

  // Keep going until we hit the end of the file...
  while (!lexer->eof(lexer)) {
    // ...or the beginning of an `endraw_statement`
    if (is_it_endraw_yet(lexer)) {
      // Have we actually consumed any characters?
      if (advanced) {
        return true; // Your `raw_content`, sir
      } else {
        return false; // The raw block is empty
      }
    }

    lexer->advance(lexer, false); // *quietly consuming another character*
    advanced = true;
  }

  // We reached the end of the file...
  // ...and it seems like someone forgot to close the raw block

  if (advanced) {
    return true; // Anyways, there's a `raw_content` for you
  }

  return false; // Who ends a file with a `raw_statement`?
}

/*
 * The main scanner function
 *
 * This is where the Tree-sitter parser asks us:
 * "Hey, can you handle any of these special tokens for me?"
 */
bool tree_sitter_askama_external_scanner_scan(void *payload, TSLexer *lexer,
                                              const bool *valid_symbols) {
  // Is this the end of the file?
  if (lexer->eof(lexer)) {
    return false; // Nothing is left to tell
  }

  if (valid_symbols[NESTED_COMMENT]) {
    lexer->result_symbol = NESTED_COMMENT;
    return scan_nested_comment(lexer);
  }

  if (valid_symbols[RAW_CONTENT]) {
    lexer->result_symbol = RAW_CONTENT;
    return scan_raw_content(lexer);
  }

  // Sorry, I have no idea what you're talking about
  return false;
}
