
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
        return function() {

            return new AbstractLdapParser(function(input) {

                let leftResult = self.$parse(input);
                if (leftResult.success) return leftResult;
                else return other().$parse(input)
            });
        }
    },

    $then: function(other) {

        const self = this;

        return function() {
            return new AbstractLdapParser(function(input) {

                let leftResult = self.$parse(input);
                if (leftResult.success) {

                    let rightResult = other().$parse(leftResult.input)
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
    }
};


const LdapGrammar = {

    token: function(value, p) {

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
    },

    key: function(value) {

        return this.token(value, function(head) {
           return head.type == "keyword";
        });
    },

    iden: function() {

        return this.token("identifier", function(head) {
            return head.type == "identifier";
        });
    },

    // Grammar stuff. At the moment we support only subset of grammar
    filter: function() {
        return this.key("(").$then(this.filtercomp()).$then(this.key(")"));
    },

    filterlist: function() {
        return this.filter().$or(this.filter().$then(this.filterlist()));
    },

    filtercomp: function() {
        return this.and().$or(this.or()).$or(this.item());
    },

    and: function() {
        return this.key("&").$then(this.filterlist());
    },

    or: function() {
        return this.key("|").$then(this.filterlist());
    },

    item: function() {
        return this.simple();
    },
    simple: function() {
        return this.iden().$then(this.filtertype()).$then(this.iden());
    },

    filtertype: function() {
        return this.equal().$or(this.approx()).$or(this.ge()).$or(this.le());
    },

    equal: function() {
        return this.key("=");
    },

    approx: function() {
        return this.key("~=");
    },

    ge: function() {
        return this.key(">=");
    },

    le: function() {
        return this.key("<=");
    }

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
     */
};





