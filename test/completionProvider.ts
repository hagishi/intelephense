import { CompletionProvider } from '../src/completionProvider';
import { SymbolStore, SymbolTable } from '../src/symbolStore';
import { ParsedDocumentStore, ParsedDocument } from '../src/parsedDocument';
import * as lsp from 'vscode-languageserver-types';
import { assert } from 'chai';
import 'mocha';

var noCompletions: lsp.CompletionList = {
    items: [],
    isIncomplete: false
};

var objectCreationSrc =
    `<?php
    class Foo {}
    $var = new F
`;

var scopedAccessSrc =
    `<?php
    class Test {
        public const FOO = 1;
        public static $bar = 1;
        public static function baz(){}
        private static $baz = 1;
    }
    $var = Test::FOO;
    $var = Test::$bar;
    $var = Test::baz();
`;

var objectSrc =
    `<?php
    class Test {
        public $foo;
        public function bar(){}
        private function baz(){}
        static function foo(){}
    }

    $var = new Test();
    $var->b
`;

var variableSrc =
    `<?php
    function foo($foo){ 
        $bar = $foo;
    }
    $baz = 2;
    $
`;

var nameSrc =
    `<?php
    class Foo {}
    class Bar {}
    b
`;

var nsUse =
    `<?php
    namespace Bar;
    use F

    class Foo {}
    class Baz {}
`;

var classBaseSrc =
    `<?php
    class Foo {}
    interface FooInterface {}
    class Bar extends F
`;

var implementsSrc =
    `<?php
    class Foo {}
    interface FooInterface {}
    class Bar extends Foo implements F 
`;

var interfaceBaseSrc =
    `<?php
    class Baz {}
    interface Bar {}
    interface Foo extends B
`;

var groupUseSrc =
    `<?php
    namespace Foo\\Bar
    use Foo\\{
        B
    }

    class Baz {}
`;

var methodTagSrc =
    `<?php
    /**
     * @method int bar()
     */
     class Foo {}
     $var = new Foo();
     $var->
`;

var propertyTagSrc =
    `<?php
    /**
     * @property int $prop
     */
    class Foo {}
    $var = new Foo();
    $var->

`;

var closureSrc =
    `<?php
    class Foo {
        function fooFn(){}
    }
    $var = new Foo();
    $fn = function($x) use ($var){
        $var->fooFn();
        /** @var Foo $x */
        $x->
    };
`;

var importSrc1 =
    `<?php
    namespace Foo;
    class Bar {}
`;

var importSrc2 =
    `<?php
    namespace Baz;
    use Foo\\Bar as Fuz;
    $obj = new F
`;

function setup(src: string) {
    let symbolStore = new SymbolStore();
    let parsedDocumentStore = new ParsedDocumentStore();
    let completionProvider = new CompletionProvider(symbolStore, parsedDocumentStore);
    let doc = new ParsedDocument('test', src);
    parsedDocumentStore.add(doc);
    symbolStore.add(SymbolTable.create(doc));
    return completionProvider;
}

function inbuiltSetup(src: string) {
    let symbolStore = new SymbolStore();
    let parsedDocumentStore = new ParsedDocumentStore();
    let completionProvider = new CompletionProvider(symbolStore, parsedDocumentStore);
    let doc = new ParsedDocument('test', src);
    parsedDocumentStore.add(doc);
    symbolStore.add(SymbolTable.create(doc));
    symbolStore.add(SymbolTable.readBuiltInSymbols());
    return completionProvider;
}

function isEqual(item: lsp.CompletionItem, label: string, kind: lsp.CompletionItemKind) {
    return item.kind === kind && item.label === label;
}

describe('CompletionProvider', () => {

    describe('Closure', () => {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(closureSrc);
        });
/*
        it('use var member completions', function () {
            let completions = completionProvider.provideCompletions('test', { line: 6, character: 14 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items[0].label, 'fooFn');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Method);
        });
*/
        it('phpdoc hinted param member completions', function () {
            let completions = completionProvider.provideCompletions('test', { line: 8, character: 12 });
            //console.log(JSON.stringify(completionProvider.symbolStore.getSymbolTable('test'), null, 4));
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items[0].label, 'fooFn');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Method);
        });

    });

    describe('Object creation', () => {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(objectCreationSrc);
        });

        it('completions', function () {
            var completions = completionProvider.provideCompletions('test', { line: 2, character: 16 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items[0].label, 'Foo');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Constructor);
        });

    });

    describe('Scoped access', () => {

        let completionProvider: CompletionProvider;

        before(function () {
            completionProvider = setup(scopedAccessSrc);
            //console.log(JSON.stringify(completionProvider.symbolStore, null, 4));
        });

        it('::', function () {
            let completions = completionProvider.provideCompletions('test', { line: 7, character: 17 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items.length, 3);
            completions.items.forEach((x) => {
                assert.isTrue(
                    isEqual(x, '$bar', lsp.CompletionItemKind.Property) ||
                    isEqual(x, 'FOO', lsp.CompletionItemKind.Value) ||
                    isEqual(x, 'baz', lsp.CompletionItemKind.Method)
                );
            });

        });


        it('$', function () {
            let completions = completionProvider.provideCompletions('test', { line: 8, character: 18 });
            assert.equal(completions.items[0].label, '$bar');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Property);
            //console.log(JSON.stringify(completions, null, 4));
        });

        it('Identifier', function () {
            let completions = completionProvider.provideCompletions('test', { line: 9, character: 18 });
            assert.equal(completions.items.length, 2);
            completions.items.forEach((x) => {
                assert.isTrue(
                    isEqual(x, '$bar', lsp.CompletionItemKind.Property) || //fuzzy search should also get properties
                    isEqual(x, 'baz', lsp.CompletionItemKind.Method)
                );
            });
            //console.log(JSON.stringify(completions, null, 4));
        });


    });

    describe('Object access', function () {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(objectSrc);
        });

        it('->', function () {
            let completions = completionProvider.provideCompletions('test', { line: 9, character: 10 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items.length, 2);
            completions.items.forEach((x) => {
                assert.isTrue(
                    isEqual(x, 'foo', lsp.CompletionItemKind.Property) ||
                    isEqual(x, 'bar', lsp.CompletionItemKind.Method)
                );
            });

        });

        it('Identifier', function () {
            let completions = completionProvider.provideCompletions('test', { line: 9, character: 11 });
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'bar');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Method);
        });

        it('@method', function () {
            let provider = setup(methodTagSrc);
            let completions = provider.provideCompletions('test', { line: 6, character: 11 });
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'bar');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Method);

        });

        it('@property', function () {
            let provider = setup(propertyTagSrc);
            let completions = provider.provideCompletions('test', { line: 6, character: 10 });
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'prop');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Property);

        });

    });

    describe('Variables', function () {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(variableSrc);
        });

        it('Suggest variable from correct scope', function () {
            let completions = completionProvider.provideCompletions('test', { line: 5, character: 5 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, '$baz');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Variable);

        });

        it('Parameters', function () {
            let completions = completionProvider.provideCompletions('test', { line: 2, character: 17 });
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, '$foo');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Variable);
            //console.log(JSON.stringify(completions, null, 4));
        });

    });

    describe('Names', function () {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(nameSrc);
        });

        it('name completions', function () {
            var completions = completionProvider.provideCompletions('test', { line: 3, character: 5 });
            //console.log(JSON.stringify(completions, null, 4));
            //should also suggest keywords abstract, break, global
            assert.equal(completions.items.length, 4);
            completions.items.forEach((x) => {
                assert.isTrue(
                    isEqual(x, 'abstract', lsp.CompletionItemKind.Keyword) ||
                    isEqual(x, 'break', lsp.CompletionItemKind.Keyword) ||
                    isEqual(x, 'global', lsp.CompletionItemKind.Keyword) ||
                    isEqual(x, 'Bar', lsp.CompletionItemKind.Class)
                );
            });

        });

    });

    describe('Namespace use', function () {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(nsUse);
        });

        it('use completions', function () {
            var completions = completionProvider.provideCompletions('test', { line: 2, character: 9 });
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'Foo');
            assert.equal(completions.items[0].insertText, 'Bar\\Foo');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Class);
            //console.log(JSON.stringify(completions, null, 4));
        });

    });

    describe('Class extends', () => {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(classBaseSrc);
        });

        it('completions', function () {
            var completions = completionProvider.provideCompletions('test', { line: 3, character: 23 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'Foo');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Class);
        });

    });

    describe('Implements', () => {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(implementsSrc);
        });

        it('completions', function () {
            var completions = completionProvider.provideCompletions('test', { line: 3, character: 38 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'FooInterface');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Interface);
        });

    });

    describe('Interface extends', () => {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(interfaceBaseSrc);
        });

        it('completions', function () {
            var completions = completionProvider.provideCompletions('test', { line: 3, character: 27 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'Bar');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Interface);
        });

    });

    describe('Use group', () => {

        let completionProvider: CompletionProvider;
        before(function () {
            completionProvider = setup(groupUseSrc);
        });

        it('completions', function () {
            var completions = completionProvider.provideCompletions('test', { line: 3, character: 9 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.equal(completions.items.length, 1);
            assert.equal(completions.items[0].label, 'Baz');
            assert.equal(completions.items[0].insertText, 'Bar\\Baz');
            assert.equal(completions.items[0].kind, lsp.CompletionItemKind.Class);
        });

    });

    describe('Imports', () => {

        let symbolStore = new SymbolStore();
        let parsedDocumentStore = new ParsedDocumentStore();
        let completionProvider = new CompletionProvider(symbolStore, parsedDocumentStore);
        let doc = new ParsedDocument('doc1', importSrc1);
        let doc2 = new ParsedDocument('doc2', importSrc2);
        parsedDocumentStore.add(doc);
        symbolStore.add(SymbolTable.create(doc));
        parsedDocumentStore.add(doc2);
        symbolStore.add(SymbolTable.create(doc2));

        let expected = <lsp.CompletionList>{
            items: [
                {
                    kind: lsp.CompletionItemKind.Constructor,
                    label: "Fuz",
                    insertText: "Fuz",
                    detail: "Foo\\Bar",
                    documentation:undefined
                }
            ],
            isIncomplete: false
        }

        it('should provide import aliases', () => {

            let completions = completionProvider.provideCompletions('doc2', { line: 3, character: 16 });
            //console.log(JSON.stringify(completions, null, 4));
            assert.deepEqual(completions, expected);
        });

    });

});








