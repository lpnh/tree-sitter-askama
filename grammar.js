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

  conflicts: $ => [[$.pattern, $._primary_expression]],

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
        $.let_statement,
        $.for_statement,
        $.endfor_statement,
        $.conditional_statement,
        $.match_statement,
        $.endmatch_statement,
        $.when_statement,
        $.endwhen_statement,
        $.include_statement,
        $.macro_statement,
        $.endmacro_statement,
        $.macro_call_statement,
        $.endcall_statement,
        $.import_statement,
      ),

    block_statement: $ => seq('block', $.identifier),

    endblock_statement: $ => seq('endblock', optional($.identifier)),

    filter_statement: $ => seq('filter', $.filter_chain),

    endfilter_statement: _ => 'endfilter',

    extends_statement: $ => seq('extends', $.string_literal),

    let_statement: $ =>
      seq(
        choice('let', 'set'),
        choice($.identifier, $.tuple_pattern),
        optional(seq('=', $._expression)),
      ),

    for_statement: $ =>
      seq('for', choice($.identifier, $.tuple_pattern), 'in', $._expression),

    endfor_statement: _ => 'endfor',

    conditional_statement: $ =>
      choice(
        seq('if', $._expression),
        seq('if', 'let', $._expression),
        seq(choice('else if', 'elif'), $._expression),
        'else',
        'endif',
      ),

    match_statement: $ => seq('match', $._expression),

    endmatch_statement: _ => 'endmatch',

    when_statement: $ =>
      seq(
        'when',
        field('pattern', $.pattern),
        optional(seq('with', field('destructure', $.pattern_destructure))),
      ),

    endwhen_statement: _ => 'endwhen',

    pattern: $ => choice($._primary_expression, $.identifier, '_'),

    pattern_destructure: $ =>
      choice(
        seq('(', sepBy1($.destructure_element, ','), ')'),
        seq('[', sepBy1($.destructure_element, ','), ']'),
      ),

    destructure_element: $ =>
      choice(
        $.identifier,
        $.string_literal,
        $.number_literal,
        $.boolean_literal,
        '_',
      ),

    include_statement: $ => seq('include', $.string_literal),

    macro_statement: $ =>
      seq(
        'macro',
        $.identifier,
        '(',
        optional(sepBy1(choice($.named_argument, $.identifier), ',')),
        ')',
      ),

    endmacro_statement: $ => seq('endmacro', optional($.identifier)),

    macro_call_statement: $ =>
      prec(
        PREC.macro_calls,
        seq(
          'call',
          optional(seq('(', sepBy1($.identifier, ','), ')')),
          $.call_expression,
        ),
      ),

    endcall_statement: _ => 'endcall',

    import_statement: $ => seq('import', $.string_literal, 'as', $.identifier),

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
      seq($._postfix_expression, choice('is', 'is not'), 'defined'),

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
      seq(
        '(',
        optional(
          seq(
            sepBy1(choice($.named_argument, $._expression), ','),
            optional(','),
          ),
        ),
        ')',
      ),

    named_argument: $ =>
      seq(field('name', $.identifier), '=', field('value', $._expression)),

    arguments: $ => seq('(', optional(sepBy1($._expression, ',')), ')'),

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
          choice($.identifier, $.path_expression, $.field_access_expression),
          $.arguments,
        ),
      ),

    field_access_expression: $ =>
      prec.left(
        PREC.function_calls,
        seq(
          choice(
            $.identifier,
            $.path_expression,
            $.call_expression,
            $.field_access_expression,
          ),
          '.',
          choice($.identifier, $.number_literal),
        ),
      ),

    _atom_expression: $ =>
      choice(
        $.path_expression,
        $.parenthesized_expression,
        $.tuple_expression,
        $.unit_expression,
        $.array_expression,
        $._primary_expression,
      ),

    path_expression: $ => seq($.identifier, repeat1(seq('::', $.identifier))),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_pattern: $ => seq('(', sepBy1($.identifier, ','), optional(','), ')'),

    tuple_expression: $ =>
      seq(
        '(',
        $._expression,
        ',',
        optional(sepBy1($._expression, ',')),
        optional(','),
        ')',
      ),

    unit_expression: _ => seq('(', ')'),

    array_expression: $ =>
      seq('[', optional(seq(sepBy1($._expression, ','), optional(','))), ']'),

    _primary_expression: $ =>
      choice(
        $.identifier,
        $.number_literal,
        $.boolean_literal,
        $.string_literal,
      ),

    identifier: _ => token(/[a-zA-Z_][a-zA-Z0-9_]*!?/),

    number_literal: _ => token(/\d+(\.\d+)?/),

    boolean_literal: _ => choice('true', 'false'),

    string_literal: _ => token(/"([^"\\]|\\.)*"/),
  },
})

function sepBy1(rule, separator) {
  return seq(rule, repeat(seq(separator, rule)))
}
