/**
 * @file Askama grammar for tree-sitter
 * @author lpnh <paniguel.lpnh@gmail.com>
 * @license Unlicense
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  function_calls: 10,
  filter: 9,
  multiplicative: 8,
  additive: 7,
  bitand: 6,
  xor: 5,
  bitor: 4,
  comparative: 3,
  and: 2,
  or: 1,
}

module.exports = grammar({
  name: 'askama',

  extras: _ => [/\s/],

  rules: {
    source: $ =>
      repeat(choice($.control_tag, $.render_expression, $.comment, $.content)),

    content: _ => token(prec(0, /[^{]+/)),

    comment: $ => seq('{#', repeat(choice($.comment, /[^#]+/, /#[^}]/)), '#}'),

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

    pattern: $ => choice($._primary_expression, '_'),

    pattern_destructure: $ =>
      choice(
        seq('(', sepByComma($.destructure_element), ')'),
        seq('[', sepByComma($.destructure_element), ']'),
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
      seq('macro', $.identifier, '(', optional($.parameter_list), ')'),
    endmacro_statement: $ => seq('endmacro', optional($.identifier)),

    macro_call_statement: $ => seq('call', $._callable, $.arguments),

    import_statement: $ => seq('import', $.string_literal, 'as', $.identifier),

    parameter_list: $ => sepByComma($.identifier),

    _expression: $ =>
      choice(
        $.binary_expression,
        $.is_defined_expression,
        $.filter_expression,
        $.call_expression,
        $.field_access_expression,
        $.tuple_expression,
        $.unit_expression,
        $.parenthesized_expression,
        $.array_expression,
        $._primary_expression,
      ),

    binary_expression: $ => {
      const table = [
        [PREC.multiplicative, choice('*', '/', '%')],
        [PREC.additive, choice('+', '-')],
        [PREC.bitand, 'bitand'],
        [PREC.bitor, 'bitor'],
        [PREC.xor, 'xor'],
        [PREC.comparative, choice('==', '!=', '<', '<=', '>', '>=')],
        [PREC.and, '&&'],
        [PREC.or, '||'],
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
      seq($.identifier, choice('is', 'is not'), 'defined'),

    filter_expression: $ =>
      prec.left(
        PREC.filter,
        seq(field('value', $._expression), field('filters', $.filter_chain)),
      ),

    filter_chain: $ =>
      prec.left(PREC.filter, seq('|', $.filter, repeat(seq('|', $.filter)))),

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
            sepByComma(choice($.filter_named_argument, $._expression)),
            optional(','),
          ),
        ),
        ')',
      ),

    filter_named_argument: $ =>
      seq(field('name', $.identifier), '=', field('value', $._expression)),

    call_expression: $ =>
      prec(
        PREC.function_calls,
        seq(field('function', $._callable), field('arguments', $.arguments)),
      ),

    _callable: $ =>
      choice($.identifier, $.path_expression, $.field_access_expression),

    field_access_expression: $ =>
      prec.left(
        PREC.function_calls,
        seq(
          field('object', $._field_access_base),
          '.',
          field('field', choice($.identifier, $.number_literal)),
        ),
      ),

    _field_access_base: $ =>
      choice(
        $.identifier,
        $.field_access_expression,
        $.call_expression,
        $.parenthesized_expression,
      ),

    path_expression: $ => seq($.identifier, repeat1(seq('::', $.identifier))),

    arguments: $ => seq('(', optional(sepByComma($._expression)), ')'),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    tuple_pattern: $ =>
      seq(
        '(',
        seq($.identifier, repeat(seq(',', $.identifier)), optional(',')),
        ')',
      ),

    tuple_expression: $ =>
      seq(
        '(',
        seq($._expression, ','),
        repeat(seq($._expression, ',')),
        optional($._expression),
        ')',
      ),

    unit_expression: _ => seq('(', ')'),

    array_expression: $ =>
      seq('[', optional(seq(sepByComma($._expression), optional(','))), ']'),

    _primary_expression: $ =>
      choice(
        $.identifier,
        $.path_expression,
        $.number_literal,
        $.boolean_literal,
        $.string_literal,
      ),

    number_literal: _ => /\d+(\.\d+)?/,

    boolean_literal: _ => choice('true', 'false'),

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*!?/,

    string_literal: _ =>
      choice(
        seq('"', repeat(/[^"\\]|\\./), '"'),
        seq("'", repeat(/[^'\\]|\\./), "'"),
      ),
  },
})

function sepByComma(rule) {
  return seq(rule, repeat(seq(',', rule)))
}
