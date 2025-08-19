/**
 * @file Askama grammar for tree-sitter
 * @author lpnh <paniguel.lpnh@gmail.com>
 * @license Unlicense
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  calls: 14,
  macro_calls: 13,
  field: 12,
  unary: 11,
  filter: 10,
  multiplicative: 9,
  additive: 8,
  bitand: 7,
  xor: 6,
  bitor: 5,
  comparative: 4,
  and: 3,
  or: 2,
  range: 1,
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

    extends_statement: $ => seq('extends', $.string_literal),

    include_statement: $ => seq('include', $.string_literal),

    import_statement: $ =>
      seq(
        'import',
        field('path', $.string_literal),
        'as',
        field('alias', $.identifier),
      ),

    let_statement: $ =>
      seq(
        choice('let', 'set'),
        optional('mut'),
        field('pattern', $._pattern),
        optional(seq('=', field('value', $._expression))),
      ),

    for_statement: $ =>
      seq(
        'for',
        field('pattern', $._pattern),
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
        $._identifier_pattern,
        $._literal_pattern,
        $.tuple_struct_pattern,
        $.array_pattern,
        $.tuple_pattern,
        $.path_expression,
        $.macro_invocation,
        $.placeholder,
      ),

    _identifier_pattern: $ => $.identifier,

    _literal_pattern: $ =>
      choice($.string_literal, $.number_literal, $.boolean_literal),

    tuple_struct_pattern: $ =>
      seq(
        field('type', choice($.identifier, $.path_expression)),
        '(',
        optional(_list($._pattern)),
        ')',
      ),

    array_pattern: $ =>
      seq('[', optional(_list(choice($._pattern, $.wildcard))), ']'),

    tuple_pattern: $ =>
      seq('(', optional(_list(choice($._pattern, $.wildcard))), ')'),

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
        $.placeholder,
      ),

    placeholder: $ => '_',

    wildcard: $ => '..',

    macro_statement: $ =>
      seq(
        'macro',
        field('name', $.identifier),
        field('arguments', $.arguments),
      ),

    endmacro_statement: $ =>
      seq('endmacro', optional(field('name', $.identifier))),

    macro_call_statement: $ =>
      prec(
        PREC.macro_calls,
        seq(
          'call',
          optional(
            field('arguments', seq('(', sepBy1($.identifier, ','), ')')),
          ),
          $.call_expression,
        ),
      ),

    endcall_statement: _ => 'endcall',

    _expression: $ => choice($._expression_except_range, $.range_expression),

    _expression_except_range: $ =>
      choice(
        $.unary_expression,
        $.reference_expression,
        $.binary_expression,
        $.call_expression,
        $.path_expression,
        $.field_access_expression,
        $.array_expression,
        $.tuple_expression,
        $.parenthesized_expression,
        prec(1, $.macro_invocation),
        $.index_expression,
        $.filter_expression,
        $.is_defined_expression,
        $.string_concatenation,
        $._primary_expression,
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

    string_concatenation: $ =>
      seq($.identifier, repeat1(seq('~', $.identifier))),

    is_defined_expression: $ =>
      seq($._primary_expression, seq(choice('is', 'is not'), 'defined')),

    filter_expression: $ =>
      prec.left(
        PREC.filter,
        seq(field('value', $._expression), field('filters', $.filter_chain)),
      ),

    filter_chain: $ => prec.left(PREC.filter, seq('|', sepBy1($.filter, '|'))),

    filter: $ =>
      prec.right(
        seq(
          field('name', $.identifier),
          field('arguments', optional($.arguments)),
        ),
      ),

    macro_invocation: $ =>
      seq(
        field('macro', choice($.identifier, $.path_expression)),
        '!',
        alias($.arguments, $.token_tree),
      ),

    call_expression: $ =>
      prec(
        PREC.calls,
        seq(
          field('function', $._expression_except_range),
          field('arguments', $.arguments),
        ),
      ),

    field_access_expression: $ =>
      prec.left(
        PREC.field,
        seq(
          field('value', $._expression),
          '.',
          field('field', choice($._field_identifier, $.number_literal)),
        ),
      ),

    index_expression: $ =>
      prec(PREC.calls, seq($._expression, '[', $._expression, ']')),

    range_expression: $ =>
      prec.left(
        PREC.range,
        choice(
          seq($._expression, choice('..', '..='), $._expression),
          seq($._expression, '..'),
          seq('..', $._expression),
          '..',
        ),
      ),

    unary_expression: $ =>
      prec(PREC.unary, seq(choice('*', '!'), $._expression)),

    reference_expression: $ =>
      prec(PREC.unary, seq('&', field('value', $._expression))),

    arguments: $ =>
      seq('(', optional(_list(choice($.named_argument, $._expression))), ')'),

    named_argument: $ =>
      seq(field('name', $.identifier), '=', field('value', $._expression)),

    path_expression: $ =>
      seq(
        field('path', optional($._path)),
        '::',
        field('name', choice($.identifier)),
      ),

    _path: $ => choice($.identifier, $.path_expression),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_expression: $ =>
      seq(
        '(',
        field('first', $._expression),
        ',',
        optional(field('rest', sepBy1($._expression, ','))),
        optional(','),
        ')',
      ),

    array_expression: $ =>
      seq('[', optional(field('elements', _list($._expression))), ']'),

    _primary_expression: $ => choice($._literal, $.identifier),

    _literal: $ =>
      choice(
        $.string_literal,
        $.boolean_literal,
        $.number_literal,
        $._negative_literal,
      ),

    _negative_literal: $ => seq('-', $.number_literal),

    number_literal: _ => token(/\d+(\.\d+)?([eE][+-]?\d+)?/),

    boolean_literal: _ => choice('true', 'false'),

    string_literal: _ => token(/"([^"\\]|\\.)*"/),

    identifier: _ => /[_\p{XID_Start}][_\p{XID_Continue}]*/,

    _field_identifier: $ => alias($.identifier, $.field_identifier),
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
