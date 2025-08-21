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

    content: _ => token(prec(PREC.content, /[^{]+|\{[^{#%]/)),

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
        $.break_statement,
        $.continue_statement,
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

    filter_statement: $ => seq('filter', sepBy1($._filter, '|')),

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

    break_statement: _ => 'break',

    continue_statement: _ => 'continue',

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

    _match_pattern: $ =>
      seq(
        choice($._pattern, $.or_pattern, $.with_pattern),
        // optional(seq('if', field('condition', $._expression))),
      ),

    endwhen_statement: _ => 'endwhen',

    _pattern: $ =>
      choice(
        $._literal,
        $.identifier,
        $.scoped_identifier,
        $.tuple_pattern,
        $.tuple_struct_pattern,
        $.slice_pattern,
        $.remaining_field,
        $.placeholder,
      ),

    tuple_pattern: $ => seq('(', _list($._pattern), ')'),

    tuple_struct_pattern: $ =>
      seq(
        field('type', choice($.identifier, $.scoped_identifier)),
        '(',
        optional(_list($._pattern)),
        ')',
      ),

    slice_pattern: $ => seq('[', optional(_list($._pattern)), ']'),

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

    placeholder: _ => '_',

    remaining_field: _ => '..',

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
        $._literal,
        $.identifier,
        $.scoped_identifier,
        $.field_expression,
        $.array_expression,
        $.tuple_expression,
        $.macro_invocation,
        $.index_expression,
        $.parenthesized_expression,
        $.is_defined_expression,
        $.filter_expression,
        $.string_concatenation,
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
      seq($.identifier, seq(choice('is', 'is not'), 'defined')),

    filter_expression: $ =>
      prec.left(
        PREC.filter,
        seq(field('value', $._expression), repeat1(seq('|', $._filter))),
      ),

    _filter: $ =>
      prec.right(
        seq(
          field('filter', $.identifier),
          field('arguments', optional($.arguments)),
        ),
      ),

    macro_invocation: $ =>
      prec(
        1,
        seq(
          field('macro', choice($.identifier, $.scoped_identifier)),
          '!',
          alias($.arguments, $.token_tree),
        ),
      ),

    call_expression: $ =>
      prec(
        PREC.calls,
        seq(
          field('function', $._expression_except_range),
          field('arguments', $.arguments),
        ),
      ),

    field_expression: $ =>
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

    scoped_identifier: $ =>
      seq(
        field('path', optional($._path)),
        '::',
        field('name', choice($.identifier)),
      ),

    _path: $ => choice($.identifier, $.scoped_identifier),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_expression: $ =>
      seq('(', $._expression, ',', optional(_list($._expression)), ')'),

    array_expression: $ => seq('[', optional(_list($._expression)), ']'),

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
