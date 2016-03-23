
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
 * @param impl {function()} which accepts input stream of tokens and returns some
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


const LdapGrammar = function() {

    function token(value, p) {

        return function() {

            return new AbstractLdapParser(function(input) {

                var result = { success: false, error: "expected " + value };
                
                if (!input.isEmpty() && p(input.head())) {
                    result = { success: true, value: input.head().value, input: input.tail(), error: null };
                }
                return result;
            });
        }
    }

    // Grammar primitives
    
    const begin = new AbstractLdapParser(function(input) {
            return { success: true, value: "", input: input };
    });
    
    function keyword(value) {

        return token(value, function(head) {
           return head.type === "keyword" && head.value === value;
        });
    }
    
    function identifier() {

        return this.token("identifier", function(head) {
            return head.type == "identifier";
        });
    }
    /*
     Grammar stuff. At the moment we support only subset of grammar
    
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
    
    /* Products */
    var P = {
        
        filter: function() {
            return begin.$then(keyword("(")).$then(P.filtercomp).$then(keyword(")"));
        },

        filtercomp: function() {
            return begin.$then(P.and).$or(P.or).$or(P.item);
        },

        and: function() {
            return begin.$then(keyword("&")).$then(P.filterlist);
        },

        or: function() {
            return begin.$then(keyword("|")).$then(P.filterlist);
        },

        filterlist: function() {
            return begin.$then(P.filter).$or(begin.$then(P.filter).$then(P.filterlist));
        },

        item: function() {
            return begin.$then(P.simple);
        },

        simple: function() {
            return begin.$then(identifier()).$then(P.filtertype).$then(identifier());
        },

        filtertype: function() {
            return begin.$then(P.equal).$or(P.approx).$or(P.ge).$or(P.le);
        },

        equal: function() {
            return begin.$then(keyword("="));
        },

        approx: function() {
            return begin.$then(keyword("~="));
        },

        ge: function() {
            return begin.$then(keyword(">="));
        },

        le: function() {
            return begin.$then(keyword("<="));
        }
    };
    
    return P.filter();
}();





