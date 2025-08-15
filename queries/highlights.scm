[
  "{{"
  "{{-"
  "{{+"
  "+}}"
  "-}}"
  "}}"
  "{%"
  "{%-"
  "{%+"
  "+%}"
  "-%}"
  "%}"
] @keyword.directive

(string_literal) @string

(integer_literal) @number

(boolean_literal) @boolean

(comment_block) @comment @spell

[
  ","
  "."
] @punctuation.delimiter

[
  "("
  ")"
  "["
  "]"
] @punctuation.bracket

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
  "="
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
] @keyword

[
  "endblock"
  "endfilter"
  "endmatch"
  "endwhen"
  "endmacro"
] @keyword

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
  "endfor"
] @keyword.repeat

(call_expression
  (identifier) @function.call)
