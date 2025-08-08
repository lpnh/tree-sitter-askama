package tree_sitter_askama_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_askama "github.com/lpnh/tree-sitter-askama.git/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_askama.Language())
	if language == nil {
		t.Errorf("Error loading Askama grammar")
	}
}
