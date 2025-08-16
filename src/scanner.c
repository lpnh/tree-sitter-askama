#include "tree_sitter/parser.h"

enum TokenType {
  NESTED_COMMENT,
};

void *tree_sitter_askama_external_scanner_create() { return NULL; }
void tree_sitter_askama_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_askama_external_scanner_serialize(void *payload,
                                                       char *buffer) {
  return 0;
}
void tree_sitter_askama_external_scanner_deserialize(void *payload,
                                                     const char *buffer,
                                                     unsigned length) {}

bool tree_sitter_askama_external_scanner_scan(void *payload, TSLexer *lexer,
                                              const bool *valid_symbols) {
  if (!valid_symbols[NESTED_COMMENT]) {
    return false;
  }

  lexer->result_symbol = NESTED_COMMENT;
  int depth = 1;

  while (lexer->lookahead != 0) {
    if (lexer->lookahead == '{') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '#') {
        depth++;
        lexer->advance(lexer, false);
      }
    } else if (lexer->lookahead == '#') {
      // Found a potential closing delimiter.
      // Mark the end of our token HERE, before we consume the '#'.
      lexer->mark_end(lexer);
      lexer->advance(lexer, false);

      if (lexer->lookahead == '}') {
        depth--;
        if (depth == 0) {
          // This was the final matching delimiter.
          // Since we already marked our end, we can just return true.
          // The parser will resume and see the '#' and '}' characters.
          return true;
        }
        // It was a nested delimiter, so consume the '}' and continue.
        lexer->advance(lexer, false);
      }
    } else {
      lexer->advance(lexer, false);
    }
  }

  return false;
}
