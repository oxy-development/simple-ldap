// TODO: Put some tests here

QUnit.test("LDAP Parser smoke test", function(assert) {

    var stream = StreamWrapper.fromArray([
        { type: "keyword", value: "(" },
        { type: "identifier", value: "objectName" },
        { type: "keyword", value: "=" },
        { type: "identifier", value: "someObjectName" },
        { type: "keyword", value: ")" }
    ]);


    const result = LdapParser.$parse(stream);
    assert.ok(result.success, "Parser exit: " + JSON.stringify(result.value));
});