QUnit.test("LdapParser::$parse the simplest filter", function(assert) {

    var stream = StreamWrapper.fromArray([
        { type: "keyword", value: "(" },
        { type: "identifier", value: "objectName" },
        { type: "keyword", value: "=" },
        { type: "identifier", value: "someObjectName" },
        { type: "keyword", value: ")" }
    ]);
    
    const expected = new Seq(new Seq("(", new Seq(new Seq("objectName", "="), "someObjectName")), ")");
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
        { type: "keyword", value: ")" },
    ]);
    
    
    const result = LdapParser.$parse(stream);
    
    assert.ok(result.success, "Parser exit: " + JSON.stringify(result));
});

// TODO: We need tokenizer :)
// TODO: Put some tests here