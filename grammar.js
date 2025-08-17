/**
 * @file Askama grammar for tree-sitter
 * @author lpnh <paniguel.lpnh@gmail.com>
 * @license Unlicense
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  function_calls: 11,
  macro_calls: 10,
  filter: 9,
  multiplicative: 8,
  additive: 7,
  bitand: 6,
  xor: 5,
  bitor: 4,
  comparative: 3,
  and: 2,
  or: 1,
  content: -1,
}

module.exports = grammar({
  name: 'askama',

  extras: _ => [/\s/],

  externals: $ => [$._nested_comment_token],

  rules: {
    source: $ =>
      repeat(choice($.control_tag, $.render_expression, $.comment, $.content)),

    content: $ => token(prec(PREC.content, /[^{]+|\{[^{#%]/)),

    comment: $ => seq('{#', $._nested_comment, '#}'),
    _nested_comment: $ => $._nested_comment_token,

    control_tag: $ =>
      seq(
        choice('{%', '{%-', '{%+', '{%~'),
        $._statement,
        choice('%}', '-%}', '+%}', '~%}'),
      ),

    render_expression: $ =>
      seq(
        choice('{{', '{{-', '{{+', '{{~'),
        $._expression,
        choice('}}', '-}}', '+}}', '~}}'),
      ),

    _statement: $ =>
      choice(
        $.block_statement,
        $.endblock_statement,
        $.filter_statement,
        $.endfilter_statement,
        $.extends_statement,
        $.include_statement,
        $.import_statement,
        $.let_statement,
        $.for_statement,
        $.endfor_statement,
        $._conditional_statement,
        $.match_statement,
        $.endmatch_statement,
        $.when_statement,
        $.endwhen_statement,
        $.macro_statement,
        $.endmacro_statement,
        $.macro_call_statement,
        $.endcall_statement,
      ),

    block_statement: $ => seq('block', field('name', $.identifier)),

    endblock_statement: $ =>
      seq('endblock', optional(field('name', $.identifier))),

    filter_statement: $ =>
      seq('filter', field('filters', sepBy1($.filter, '|'))),

    endfilter_statement: _ => 'endfilter',

    extends_statement: $ => seq('extends', field('template', $.string_literal)),

    include_statement: $ => seq('include', field('template', $.string_literal)),

    import_statement: $ =>
      seq(
        'import',
        field('template', $.string_literal),
        'as',
        field('name', $.identifier),
      ),

    let_statement: $ =>
      seq(
        choice('let', 'set'),
        optional('mut'),
        field('pattern', choice($.identifier, $.tuple_pattern)),
        optional(seq('=', field('value', $._expression))),
      ),

    for_statement: $ =>
      seq(
        'for',
        field('pattern', choice($.identifier, $.tuple_pattern)),
        'in',
        field('value', $._expression),
      ),

    endfor_statement: _ => 'endfor',

    _conditional_statement: $ =>
      choice(
        $.if_statement,
        $.else_if_statement,
        $.else_statement,
        $.endif_statement,
      ),

    if_statement: $ =>
      seq('if', field('condition', choice($._expression, $.let_condition))),

    let_condition: $ =>
      seq(
        'let',
        field('pattern', $._pattern),
        '=',
        field('value', $._expression),
      ),

    else_if_statement: $ =>
      seq(choice('else if', 'elif'), field('condition', $._expression)),

    else_statement: _ => 'else',

    endif_statement: _ => 'endif',

    match_statement: $ => seq('match', field('value', $._expression)),

    endmatch_statement: _ => 'endmatch',

    when_statement: $ => seq('when', field('pattern', $._match_pattern)),

    _match_pattern: $ => choice($._pattern, $.or_pattern, $.with_pattern),

    endwhen_statement: _ => 'endwhen',

    _pattern: $ =>
      choice(
        '_',
        $._identifier_pattern,
        $._literal_pattern,
        $.tuple_struct_pattern,
        $.array_pattern,
        $.tuple_pattern_match,
      ),

    _identifier_pattern: $ => $.identifier,

    _literal_pattern: $ =>
      choice($.string_literal, $.number_literal, $.boolean_literal),

    tuple_struct_pattern: $ =>
      seq(field('type', $.identifier), '(', optional(_list($._pattern)), ')'),

    array_pattern: $ =>
      seq('[', optional(_list(choice($._pattern, '..'))), ']'),

    tuple_pattern_match: $ =>
      seq('(', optional(_list(choice($._pattern, '..'))), ')'),

    or_pattern: $ => seq($._pattern, '|', sepBy1($._pattern, '|')),

    with_pattern: $ => seq($._pattern, 'with', $._pattern_destructure),

    _pattern_destructure: $ =>
      choice(
        seq('(', sepBy1($._destructure_element, ','), ')'),
        seq('[', sepBy1($._destructure_element, ','), ']'),
      ),

    _destructure_element: $ =>
      choice(
        $.identifier,
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        '_',
      ),

    macro_statement: $ =>
      seq(
        'macro',
        field('name', $.identifier),
        '(',
        optional(_list(choice($.named_argument, $.identifier))),
        ')',
      ),

    endmacro_statement: $ =>
      seq('endmacro', optional(field('name', $.identifier))),

    macro_call_statement: $ =>
      prec(
        PREC.macro_calls,
        seq(
          'call',
          optional(seq('(', sepBy1($.identifier, ','), ')')),
          field('call', $.call_expression),
        ),
      ),

    endcall_statement: _ => 'endcall',

    _expression: $ =>
      choice(
        $.binary_expression,
        $.is_defined_expression,
        $.filter_expression,
        $._postfix_expression,
      ),

    binary_expression: $ => {
      const table = [
        [PREC.or, '||'],
        [PREC.and, '&&'],
        [PREC.comparative, choice('==', '!=', '<', '<=', '>', '>=')],
        [PREC.xor, 'xor'],
        [PREC.bitor, 'bitor'],
        [PREC.bitand, 'bitand'],
        [PREC.additive, choice('+', '-')],
        [PREC.multiplicative, choice('*', '/', '%')],
      ]

      return choice(
        ...table.map(([precedence, operator]) =>
          prec.left(
            // @ts-ignore
            precedence,
            seq(
              field('left', $._expression),
              // @ts-ignore
              field('operator', operator),
              field('right', $._expression),
            ),
          ),
        ),
      )
    },

    is_defined_expression: $ =>
      seq(
        field('expression', $._postfix_expression),
        field('operator', choice('is', 'is not')),
        'defined',
      ),

    filter_expression: $ =>
      prec.left(
        PREC.filter,
        seq(
          field('value', $._postfix_expression),
          field('filters', $.filter_chain),
        ),
      ),

    filter_chain: $ => prec.left(PREC.filter, seq('|', sepBy1($.filter, '|'))),

    filter: $ =>
      seq(
        field('name', $.identifier),
        field('arguments', optional($.filter_arguments)),
      ),

    filter_arguments: $ =>
      seq('(', optional(_list(choice($.named_argument, $._expression))), ')'),

    _postfix_expression: $ =>
      prec.left(
        PREC.function_calls,
        choice(
          $.call_expression,
          $.field_access_expression,
          $._atom_expression,
        ),
      ),

    call_expression: $ =>
      prec.left(
        PREC.function_calls,
        seq(
          field(
            'function',
            choice($.identifier, $.path_expression, $.field_access_expression),
          ),
          field('arguments', $.arguments),
        ),
      ),

    field_access_expression: $ =>
      prec.left(
        PREC.function_calls,
        seq(
          field(
            'object',
            choice(
              $.identifier,
              $.path_expression,
              $.call_expression,
              $.field_access_expression,
              $.array_expression,
            ),
          ),
          '.',
          field('field', choice($.identifier, $.number_literal)),
        ),
      ),

    arguments: $ => seq('(', optional(_list($._expression)), ')'),

    named_argument: $ =>
      seq(field('name', $.identifier), '=', field('value', $._expression)),

    _atom_expression: $ =>
      choice(
        $.path_expression,
        $.parenthesized_expression,
        $.tuple_expression,
        $.unit_expression,
        $.array_expression,
        $._primary_expression,
      ),

    path_expression: $ =>
      seq(
        field('path', $.identifier),
        repeat1(seq('::', field('name', $.identifier))),
      ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_pattern: $ => seq('(', sepBy1($.identifier, ','), optional(','), ')'),

    tuple_expression: $ =>
      seq(
        '(',
        field('first', $._expression),
        ',',
        optional(field('rest', sepBy1($._expression, ','))),
        optional(','),
        ')',
      ),

    unit_expression: _ => seq('(', ')'),

    array_expression: $ =>
      seq('[', optional(field('elements', _list($._expression))), ']'),

    _primary_expression: $ =>
      choice(
        $.identifier,
        $.number_literal,
        $.boolean_literal,
        $.string_literal,
      ),

    identifier: _ => token(/[a-zA-Z_][a-zA-Z0-9_]*!?/),

    number_literal: _ => token(/\d+(\.\d+)?([eE][+-]?\d+)?/),

    boolean_literal: _ => choice('true', 'false'),

    string_literal: _ => token(/"([^"\\]|\\.)*"/),
  },
})

/**
 * Match one or more occurrences separated by a delimiter
 * @param {RuleOrLiteral} rule - The rule to repeat
 * @param {RuleOrLiteral} separator - The separator
 */
function sepBy1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)))
}

/**
 * Match a comma-separated list with optional trailing comma
 * @param {RuleOrLiteral} rule - The rule for list items
 */
function _list(rule) {
  return seq(sepBy1(rule, ','), optional(','))
}
