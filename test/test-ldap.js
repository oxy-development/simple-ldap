var Oxy = require("../src/simple-ldap.js");


exports.testNegationMethodWorks = function(test) {

    'use strict';

    let data = Oxy.LdapFilter.New("objectName").eq("Stuff").not();

    test.ok(data.isNot(), "Constructed object must be negated");
    test.ok(data.toString() === "(!(objectName=Stuff))", "toString() ust return (!(objectName=Stuff))");
    test.done();
};

