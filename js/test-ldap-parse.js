// TODO: Put some tests here

QUnit.test("LDAP Parser smoke test", function(assert) {

    var stream = StreamWrapper.fromArray([
        { type: "keyword", value: "(" },
        { type: "identifier", value: "objectName" },
        { type: "keyword", value: "=" },
        { type: "identifier", value: "someObjectName" },
        { type: "keyword", value: ")" }
    ]);

    const expected = Seq(Seq("(", Seq(Seq("objectName", "="), "someObjectName")), ")")
    const result = LdapParser.$parse(stream);
    assert.ok(result.success && result.value.equals(expected), "Parser exit: " + JSON.stringify(result.value));
});