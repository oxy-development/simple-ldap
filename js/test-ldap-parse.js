

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


    const tkn = Oxy.ldapTokenizer("(&(abc=def)(zxy=oph))");
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

        const tkn = Oxy.ldapTokenizer("(abc~=def)");
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

        const tkn = Oxy.ldapTokenizer("(abc>=def)");
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

        const tkn = Oxy.ldapTokenizer("(abc<=def)");
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

        const tkn = Oxy.ldapTokenizer("( abc <= def )");
        return JSON.stringify(Array.from(tkn)) === expected;

    }(), "parse <= condition with whitespaces in identifiers");
});


/**
 * Constructs successful assertions
 * @param assert QUnit's assert
 * @param queryStr {string} queryStr line
 * @param resType {Function} expected type
 * @param note {string} notice
 * @returns {Function}
 */
function assertParsed(assert, queryStr, resType, note) {

    const result = Oxy.LdapParser.parse(queryStr);
    assert.ok(
        result.success
            && result.value instanceof resType
            && result.value.toString() === queryStr
        , note);
}


QUnit.test("LdapParser::parse the simplest filter", function(assert) {

    assertParsed(assert, "(objectName=someObjectName)", Oxy.LdapFilter, "Test filter by '='");
    assertParsed(assert, "(objectName~=someObjectName)", Oxy.LdapFilter, "Test filter by '~='");
    assertParsed(assert, "(objectName>=someObjectName)", Oxy.LdapFilter, "Test filter by '>='");
    assertParsed(assert, "(objectName<=someObjectName)", Oxy.LdapFilter, "Test filter by '<='");
});


QUnit.test("LdapParser::parse two combined items", function(assert) {

    assertParsed(assert,
        "(&(objectName=someObjectName)(objectType=someObjectType))",
        Oxy.LdapFilterList,
        "Two items connected through &");

    assertParsed(assert,
        "(|(objectName=someObjectName)(objectType=someObjectType))",
        Oxy.LdapFilterList,
        "Two items connected through |");
});


QUnit.test("LdapParser::parse filter list of one element", function(assert) {

    assertParsed(assert,
        "(&(objectName=someObjectName))",
        Oxy.LdapFilterList,
        "Single item connected through &");

    assertParsed(assert,
        "(|(objectName=someObjectName))",
        Oxy.LdapFilterList,
        "Single item connected through |");
});


QUnit.test("LdapParse::parse filter list with nested filter list", function(assert) {

    assertParsed(assert,
        "(|(objectName=someObjectName)(&(otherObject=someOtherObject)))",
        Oxy.LdapFilterList,
        "One nested filter list");

    assertParsed(assert,
        "(|(objectName=someObjectName)(&(otherObject=someOtherObject)(|(objectName=someObjectName))))",
        Oxy.LdapFilterList,
        "One nested filter with one nested filter");
});

// TODO: Put more tests here