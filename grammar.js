/**
 * @file Askama grammar for tree-sitter
 * @author lpnh <paniguel.lpnh@gmail.com>
 * @license Unlicense
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  function_calls: 9,
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
      repeat(
        choice(
          $.statement_block,
          $.expression_block,
          $.comment_block,
          $.content,
        ),
      ),

    content: _ => token(prec(0, /[^{]+/)),

    statement_block: $ =>
      seq(
        choice('{%', '{%-', '{%+', '{%~'),
        $._statement,
        choice('%}', '-%}', '+%}', '~%}'),
      ),

    expression_block: $ =>
      seq(
        choice('{{', '{{-', '{{+', '{{~'),
        $._expression,
        choice('}}', '-}}', '+}}', '~}}'),
      ),

    // tags (?)
    _statement: $ =>
      choice(
        $.block_statement,
        $.endblock_statement,
        $.filter_statement,
        'endfilter',
        $.extends_statement,
        $.let_statement,
        $.for_statement,
        'endfor',
        $.if_expression,
        $.if_let_expression,
        $.else_if_expression,
        'else',
        'endif',
        $.match_statement,
        'endmatch',
        $.when_statement,
        'endwhen',
        $.include_statement,
        $.macro_statement,
        $.endmacro_statement,
        $.macro_call_statement,
        $.import_statement,
      ),

    block_statement: $ => seq('block', $.identifier),

    endblock_statement: $ => seq('endblock', optional($.identifier)),

    filter_statement: $ => seq('filter', $.identifier),

    extends_statement: $ => seq('extends', $.string_literal),

    let_statement: $ =>
      seq(
        choice('let', 'set'),
        $.identifier,
        optional(seq('=', $._expression)),
      ),

    for_statement: $ => seq('for', $.identifier, 'in', $.identifier),

    if_expression: $ => seq('if', $._expression),

    if_let_expression: $ => seq('if let', $._expression),

    else_if_expression: $ => seq(choice('else if', 'elif'), $._expression),

    match_statement: $ => seq('match', $.identifier),

    when_statement: $ => seq('when', $._expression),

    include_statement: $ => seq('include', $.string_literal),

    macro_statement: $ =>
      seq('macro', $.identifier, '(', optional($.parameter_list), ')'),

    endmacro_statement: $ => seq('endmacro', optional($.identifier)),

    macro_call_statement: $ =>
      seq(
        'call',
        choice($.identifier, $.scoped_identifier),
        '(',
        optional($.argument_list),
        ')',
      ),

    import_statement: $ => seq('import', $.string_literal, 'as', $.identifier),

    parameter_list: $ => seq($.identifier, repeat(seq(',', $.identifier))),

    argument_list: $ => seq($._expression, repeat(seq(',', $._expression))),

    _expression: $ =>
      choice(
        $.binary_expression,
        $.is_defined_expression,
        $.call_expression,
        $.tuple_expression,
        $.unit_expression,
        seq('(', $._expression, ')'),
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

    call_expression: $ =>
      prec(
        PREC.function_calls,
        seq(field('function', $.identifier), field('arguments', $.arguments)),
      ),

    arguments: $ => seq('(', optional(sepByComma($._expression)), ')'),

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
        $.integer_literal,
        $.boolean_literal,
        $.string_literal,
      ),

    integer_literal: _ => /\d+(\.\d+)?/,

    boolean_literal: _ => choice('true', 'false'),

    scoped_identifier: $ => seq($.identifier, '::', $.identifier),

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    string_literal: _ =>
      choice(
        seq('"', repeat(/[^"\\]|\\./), '"'),
        seq("'", repeat(/[^'\\]|\\./), "'"),
      ),

    comment_block: $ =>
      seq('{#', repeat(choice($.comment_block, /[^#]+/, /#[^}]/)), '#}'),
  },
})

function sepByComma(rule) {
  return seq(rule, repeat(seq(',', rule)))
}
