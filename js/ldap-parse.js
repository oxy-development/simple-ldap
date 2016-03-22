
"use strict";


/**
 * Stream wrapper for {Array} object
 * @param data
 * @param data.array array to be wrapped
 * @param data.pos current position to be used
 * @constructor
 */
function StreamWrapper(data) {
    this.array = data.array;
    this.pos = data.pos;
}


StreamWrapper.fromArray = function(array) {
    return new StreamWrapper({ pos: 0, array: array });
};


StreamWrapper.prototype = {

    isEmpty: function() { return this.pos >= this.array.length; },

    head: function() {
        if(this.isEmpty()) {
            throw new Error("StreamWrapper is empty")
        }
        return this.array[this.pos];
    },

    tail: function() {

        if(this.isEmpty()) {
            throw new Error("StreamWrapper is empty")
        }
        return new StreamWrapper({
            array: this.array,
            pos: this.pos + 1
        });
    }
};


function Seq(_1, _2) {
    this._1 = _1;
    this._2 = _2;
}


/**
 *
 * @param impl is {function} which accepts input stream of tokens and returns some
 * parse result.
 * @constructor
 */
function AbstractLdapParser(impl) {
    this.f = impl;
}


// TODO:  This stuff is not ready for use. It is just a sketch
AbstractLdapParser.prototype = {

    $parse: function(input) {
        this.f.call(this, input);
    },

    $or: function(other) {

        const self = this;
        return new AbstractLdapParser(function(input) {

            let leftResult = self.$parse(input);
            if (leftResult.success) return leftResult;
            else return other().$parse(input)
        });
    },

    $then: function(other) {

        const self = this;
        return new AbstractLdapParser(function(input) {

            let leftResult = self.$parse(input);
            if (leftResult.success) {

                let rightResult = other().$parse(leftResult.input);
                if (rightResult.success) {
                    return {
                        success: true,
                        value: new Seq(leftResult.value, rightResult.value),
                        input: rightResult.input
                    };
                } else {
                    return rightResult;
                }
            } else {
                return leftResult;
            }
        });
    }
};


const LdapGrammar = {

    token: function(value, p) {

        return function() {

            return new AbstractLdapParser(function(input) {

                if (input.isEmpty()) {
                    return { success: false, error: "expected " + value };
                } else {

                    var head = input.head();
                    if (p(head)) {
                        return { success: true, value: head.value, input: input.tail() };
                    } else {
                        return { success: false, error: "expected " + value };
                    }
                }
            });
        }
    },

    begin: new AbstractLdapParser(function(input) {
            return { success: true, value: "", input: input };
    }),

    keyword: function(value) {

        return this.token(value, function(head) {
           return head.type == "keyword";
        });
    },

    identifier: function() {

        return this.token("identifier", function(head) {
            return head.type == "identifier";
        });
    },

    // Grammar stuff. At the moment we support only subset of grammar

    /*

     <filter> ::= '(' <filtercomp> ')'
     <filtercomp> ::= <and> | <or> | <not> | <item>
     <and> ::= '&' <filterlist>
     <or> ::= '|' <filterlist>
     <not> ::= '!' <filter>
     <filterlist> ::= <filter> | <filter> <filterlist>
     <item> ::= <simple> | <present> | <substring>
     <simple> ::= <attr> <filtertype> <value>
     <filtertype> ::= <equal> | <approx> | <ge> | <le>
     <equal> ::= '='
     <approx> ::= '~='
     <ge> ::= '>='
     <le> ::= '<='
     <present> ::= <attr> '=*'
     <substring> ::= <attr> '=' <initial> <any> <final>
     <initial> ::= NULL | <value>
     <any> ::= '*' <starval>
     <starval> ::= NULL | <value> '*' <starval>
     <final> ::= NULL | <value>


        Grammar was taken from here
        https://msdn.microsoft.com/en-us/library/windows/desktop/aa746475%28v=vs.85%29.aspx
     */

    filter: function() {
        return this.begin.$then(this.keyword("(")).$then(this.filtercomp).$then(this.keyword(")"));
    },

    filtercomp: function() {
        return this.begin.$then(this.and).$or(this.or).$or(this.item);
    },

    and: function() {
        return this.begin.$then(this.keyword("&")).$then(this.filterlist);
    },

    or: function() {
        return this.begin.$then(this.keyword("|")).$then(this.filterlist);
    },

    filterlist: function() {
        return this.begin.$then(this.filter).$or(this.$().$then(this.filter).$then(this.filterlist));
    },

    item: function() {
        return this.begin.$then(this.simple);
    },

    simple: function() {
        return this.begin.$then(this.identifier()).$then(this.filtertype).$then(this.identifier());
    },

    filtertype: function() {
        return this.begin.$then(this.equal).$or(this.approx).$or(this.ge).$or(this.le);
    },

    equal: function() {
        return this.begin.$then(this.keyword("="));
    },

    approx: function() {
        return this.begin.$then(this.keyword("~="));
    },

    ge: function() {
        return this.begin.$then(this.keyword(">="));
    },

    le: function() {
        return this.begin.$then(this.keyword("<="));
    }
};





