

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


QUnit.test("LdapParser::parse the simplest filter", function(assert) {

    assert.ok(
        function() {
            const strQuery = "(objectName=someObjectName)";
            const result = LdapParser.parse(strQuery);
            return result.success && result.value instanceof LdapItem && result.value.toString() === strQuery;
        },
        "Test filter by '='"
    );

    assert.ok(
        function() {
            const strQuery = "(objectName~=someObjectName)";
            const result = LdapParser.parse(strQuery);
            return result.success && result.value instanceof LdapItem && result.value.toString() === strQuery;
        },
        "Test filter by '~='"
    );

    assert.ok(
        function() {
            const strQuery = "(objectName>=someObjectName)";
            const result = LdapParser.parse(strQuery);
            return result.success && result.value instanceof LdapItem && result.value.toString() === strQuery;
        },
        "Test filter by '>='"
    );

    assert.ok(
        function() {
            const strQuery = "(objectName<=someObjectName)";
            const result = LdapParser.parse(strQuery);
            return result.success && result.value instanceof LdapItem && result.value.toString() === strQuery;
        },
        "Test filter by '<='"
    );
});


QUnit.test("LdapParser::parse two combined items", function(assert) {

    assert.ok(
        function() {

            const strQuery = "(&(objectName=someObjectName)(objectType=someObjectType))";
            const result = LdapParser.parse(strQuery);
            return result.success && result.value.toString() === strQuery;
        }(), "Two items connected through &"
    );

    assert.ok(
        function() {

            const strQuery = "(|(objectName=someObjectName)(objectType=someObjectType))";
            const result = LdapParser.parse(strQuery);
            return result.success && result.value.toString() === strQuery;
        }(), "Two items connected through |"
    );
});

// TODO: We need tokenizer :)
// TODO: Put some tests here