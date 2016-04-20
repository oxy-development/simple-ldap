var Oxy = require("../src/simple-ldap.js");


exports.testTokenGenerator1 = function(test) {

    var expected = JSON.stringify([
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


    var tkn = Oxy.ldapTokenizer("(&(abc=def)(zxy=oph))");
    var result = JSON.stringify(Array.from(tkn));
    test.ok(result === expected, "Token generator test - 1, result: " + result);
    test.done();
};


exports.testTokenGenerator2 = function(test) {

    test.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: "~=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        var tkn = Oxy.ldapTokenizer("(abc~=def)");
        return JSON.stringify(Array.from(tkn)) === expected;
    }(), "parse ~= condition");

    test.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: ">=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        var tkn = Oxy.ldapTokenizer("(abc>=def)");
        return JSON.stringify(Array.from(tkn)) === expected;

    }(), "parse >= condition");

    test.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: "<=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        var tkn = Oxy.ldapTokenizer("(abc<=def)");
        return JSON.stringify(Array.from(tkn)) === expected;

    }(), "parse <= condition");

    test.ok(function () {

        var expected = JSON.stringify([
            { type: "keyword", value: "(" },
            { type: "identifier", value: "abc" },
            { type: "keyword", value: "<=" },
            { type: "identifier", value: "def" },
            { type: "keyword", value: ")" }
        ]);

        var tkn = Oxy.ldapTokenizer("( abc <= def )");
        return JSON.stringify(Array.from(tkn)) === expected;

    }(), "parse <= condition with whitespaces in identifiers");
    test.done();
};


/**
 * Constructs successful assertions
 * @param test nunit's test object
 * @param queryStr {string} queryStr line
 * @param resType {Function} expected type
 * @param note {string} notice
 * @returns {Function}
 */
function assertParsed(test, queryStr, resType, note) {

    var result = Oxy.LdapParser.parse(queryStr);
    test.ok(
        result.success
            && result.value instanceof resType
            && result.value.toString() === queryStr
        , note);
}


exports.testParseSimpleFilters = function(test) {

    assertParsed(test, "(objectName=someObjectName)", Oxy.LdapFilter, "Test filter by '='");
    assertParsed(test, "(objectName~=someObjectName)", Oxy.LdapFilter, "Test filter by '~='");
    assertParsed(test, "(objectName>=someObjectName)", Oxy.LdapFilter, "Test filter by '>='");
    assertParsed(test, "(objectName<=someObjectName)", Oxy.LdapFilter, "Test filter by '<='");
    test.done();
};


exports.testParseTwoCombinedFilters = function(test) {

    assertParsed(test,
        "(&(objectName=someObjectName)(objectType=someObjectType))",
        Oxy.LdapFilterList,
        "Two items connected through &");

    assertParsed(test,
        "(|(objectName=someObjectName)(objectType=someObjectType))",
        Oxy.LdapFilterList,
        "Two items connected through |");
    test.done();
};


exports.testParseFilterListOfOneElement = function(test) {

    assertParsed(test,
        "(&(objectName=someObjectName))",
        Oxy.LdapFilterList,
        "Single item connected through &");

    assertParsed(test,
        "(|(objectName=someObjectName))",
        Oxy.LdapFilterList,
        "Single item connected through |");
    test.done();
};


exports.testParseFilterListWithNestedFilterList = function(test) {

    assertParsed(test,
        "(|(objectName=someObjectName)(&(otherObject=someOtherObject)))",
        Oxy.LdapFilterList,
        "One nested filter list");

    assertParsed(test,
        "(|(objectName=someObjectName)(&(otherObject=someOtherObject)(|(objectName=someObjectName))))",
        Oxy.LdapFilterList,
        "One nested filter with one nested filter");
    test.done();
};


exports.testParseFiltersWithNegations = function(test) {

    assertParsed(test,
       "(!(objectName=objectNameValue))",
        Oxy.LdapFilterList,
       "One negation object");

    assertParsed(test,
        "(!(&(objectName=someObjectName)(objectValue=someObjectValue)))",
        Oxy.LdapFilterList,
        "Negation of filter list");


    assertParsed(test,
        "(&(!(badObjectKey=badObjectValue))(goodObjectKey=goodObjectValue))",
        Oxy.LdapFilterList,
        "Negation within filter list");


    assertParsed(test,
        "(&(|(someGoodKey=someGoodValue)(!(someBadKey=someBadValue)))(someKey3~=3))",
        Oxy.LdapFilterList,
        "Negation within within filter list"
    );
    test.done();
};

// TODO: Put more tests here