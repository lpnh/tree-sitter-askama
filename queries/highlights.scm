[
  "{{"
  "{{-"
  "{{+"
  "{{~"
  "~}}"
  "+}}"
  "-}}"
  "}}"
  "{%"
  "{%-"
  "{%+"
  "{%~"
  "~%}"
  "+%}"
  "-%}"
  "%}"
] @keyword.directive

(string_literal) @string

(number_literal) @number

(boolean_literal) @boolean

(comment) @comment @spell

[
  ","
  "."
  "::"
] @punctuation.delimiter

[
  "("
  ")"
  "["
  "]"
] @punctuation.bracket

[
  "|"
  "="
] @operator

[
  "is"
  "is not"
  "bitor"
  "xor"
  "bitand"
  "&&"
  "||"
  "+"
  "-"
  "*"
  "/"
  "%"
  "<="
  ">="
  "<"
  ">"
  "=="
  "!="
] @operator

[
  "block"
  "filter"
  "extends"
  "let"
  "set"
  "match"
  "when"
  "macro"
  "call"
  "import"
  "as"
  "with"
  "defined"
] @keyword

[
  "endblock"
  "endmacro"
] @keyword

; End statement
(endfilter_statement) @keyword
(endmatch_statement) @keyword
(endwhen_statement) @keyword
(endcall_statement) @keyword

[
  "if"
  "else"
  "else if"
  "elif"
  "endif"
] @keyword.conditional

[
  "for"
  "in"
  (endfor_statement)
] @keyword.repeat


; Function calls
(call_expression
  (identifier) @function.call)

(call_expression
  (path_expression) @function.call)

(call_expression
  (field_access_expression
    (identifier) @function.call))

; Macro calls
(macro_call_statement
  (identifier) @function.call)

; Filter names
(filter
  name: (identifier) @function.builtin)

; Macro definitions
(macro_statement
  (identifier) @function.method)

; Block names
(block_statement
  (identifier) @tag)

(endblock_statement
  (identifier) @tag)

; Variables and identifiers
(let_statement
  (identifier) @variable)

(let_statement
  (tuple_pattern
    (identifier) @variable))

(for_statement
  (identifier) @variable)

(for_statement
  (tuple_pattern
    (identifier) @variable))

; Field access
(field_access_expression
  (identifier) @variable
  (identifier) @property)

; Include and import paths
(extends_statement
  (string_literal) @string.special.path)

(include_statement
  (string_literal) @string.special.path)

(import_statement
  (string_literal) @string.special.path)

; Import aliases
(import_statement
  (identifier) @variable)

; Pattern matching
(pattern
  (identifier) @variable)

(destructure_element
  (identifier) @variable)

; Path expressions (module::function)
(path_expression
  (identifier) @module
  (identifier) @function .)

; Wildcard
"_" @variable.builtin
