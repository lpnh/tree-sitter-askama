import XCTest
import SwiftTreeSitter
import TreeSitterAskama

final class TreeSitterAskamaTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_askama())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Askama grammar")
    }
}
