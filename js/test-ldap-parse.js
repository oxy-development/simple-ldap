

QUnit.test("Token generator test - 1", function(assert) {

    const expected = JSON.stringify([
        { type: "keyword", value:"(" },
        { type: "keyword", value:"&" },
            { type: "keyword", value:"(" },
                { type: "identifier", value: "abc" },
                { type: "keyword", value: "="},
                { type: "identifier", value: "def" },
            { type: "keyword", value: ")" },
            { type: "keyword", value: "(" },
                { type: "identifier", value:"zxy" },
                { type: "keyword", value: "=" },
                { type: "identifier", value: "oph" },
            { type: "keyword", value:")" },
        { type: "keyword", value:")"}
    ]);

    const tkn = tokenizer("(&(abc=def)(zxy=oph))");
    const result = JSON.stringify(Array.from(tkn));
    assert.ok(result === expected, result);
});


QUnit.test("Token generator test - 2", function(assert) {

    assert.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: "~=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        const tkn = tokenizer("(abc~=def)");
        return JSON.stringify(Array.from(tkn)) === expected;
    }(), "parse ~= condition");

    assert.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: ">=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        const tkn = tokenizer("(abc>=def)");
        return JSON.stringify(Array.from(tkn)) === expected;

    }(), "parse >= condition");

    assert.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: "<=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        const tkn = tokenizer("(abc<=def)");
        return JSON.stringify(Array.from(tkn)) === expected;

    }(), "parse <= condition");

    assert.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: "<=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        const tkn = tokenizer("( abc <= def )");
        return JSON.stringify(Array.from(tkn)) === expected;

    }(), "parse <= condition with whitespaces in identifiers");
});


QUnit.test("LdapParser::$parse the simplest filter", function(assert) {

    var stream = StreamWrapper.fromArray([
        { type: "keyword", value: "(" },
        { type: "identifier", value: "objectName" },
        { type: "keyword", value: "=" },
        { type: "identifier", value: "someObjectName" },
        { type: "keyword", value: ")" }
    ]);
    
    const expected = new Tree(new Tree("(", new Tree(new Tree("objectName", "="), "someObjectName")), ")");
    const result = LdapParser.$parse(stream);
    assert.ok(result.success && result.value.equals(expected), "Parser exit: " + JSON.stringify(result.value));
});


QUnit.test("LdapParser::$parse two combined items", function(assert) {
    
    var stream = StreamWrapper.fromArray([
        
        { type: "keyword", value: "(" },
        { type: "keyword", value: "&" },
            { type: "keyword", value: "(" },
            { type: "identifier", value: "objectName" },
            { type: "keyword", value: "=" },
            { type: "identifier", value: "someObjectName" },
            { type: "keyword", value: ")" },
            { type: "keyword", value: "(" },
            { type: "identifier", value: "objectType" },
            { type: "keyword", value: "=" },
            { type: "identifier", value: "someObjectType" },
            { type: "keyword", value: ")" },
        { type: "keyword", value: ")" }
    ]);
    
    
    const result = LdapParser.$parse(stream);
    
    assert.ok(result.success, "Parser exit: " + JSON.stringify(result));
});

// TODO: We need tokenizer :)
// TODO: Put some tests here