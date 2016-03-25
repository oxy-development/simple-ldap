
'use strict';


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


/**
 * Naive tokenizer implementation
 */
function* tokenizer(str) {
    
    function newKeyword(kw) {
        return { type: "keyword", value: kw };
    }
    
    function newIdentifier(value) {
        return { type: "identifier", value: value };
    }
    
    let identifier=false;
    let accumulator=[];
    
    for (let i=0, len = str.length ; i < len; i++) {
        
        switch (str[i]) {
            
            
            case '(': case ')': case '=': case '&': case '|': case '!': case '~': case '>': case '<': 
                
                if (identifier) {
                    identifier = false;
                    let ni = accumulator.join('');
                    accumulator = [];
                    yield newIdentifier(ni);
                }
                
                switch (str[i]) {
                    
                    // Compound keywords
                    case '~': case '>': case '<':
                         
                        let nextI = i + 1;
                        if (nextI < len && str[nextI] === "=" ) {
                            yield newKeyword(str[i] + str[nextI]);
                            i++;
                        } else {
                            throw new Error("Unexpected token " + str[i] + " at position " + i + ".");  
                        }
                        break;
                
                    // Single char keywords
                    default:
                        yield newKeyword(str[i]);
                        break;
                }
            default:
                
                identifier=true;
                accumulator.push(str[i]);
                break;
        }
    }
}


/**
 * TODO: rename
 * Tuple
 */
function Seq(val1_, val2_) {
    this._1 = val1_;
    this._2 = val2_;
}


Seq.prototype = {
    
    /**
     * Tree structure equality check
     * @param that {object} to be compared with
     */
    equals: function(that) {
        
        if (that instanceof Seq) {
        
            function eq(left, right) {
                return (left instanceof Seq ? left.equals(right) : left === right);
            }
            
            return eq(this._1, that._1) && eq(this._2, that._2)
        } else {
            return false;
        }
    } 
};



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
        return this.f.call(this, input);
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


const LdapParser = function() {

    function token(value, p) {

        return function() {

            return new AbstractLdapParser(function(input) {

                var result = { success: false, error: "expected " + value, input: input };
                
                if (!input.isEmpty() && p(input.head())) {
                    result = { success: true, value: input.head().value, input: input.tail(), error: null };
                }
                return result;
            });
        }
    }

    // Grammar primitives
    
    const nothing = new AbstractLdapParser(function(input) {
            return { success: false, error: "Nothing case" };
    });
    
    function keyword(value) {

        return token(value, function(head) {
           return head.type === "keyword" && head.value === value;
        });
    }
    
    function identifier() {

        return token("identifier", function(head) {
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
            return nothing.$or(keyword("(")).$then(P.filtercomp).$then(keyword(")"));
        },

        filtercomp: function() {
            return nothing.$or(P.and).$or(P.or).$or(P.item);
        },

        and: function() {
            return nothing.$or(keyword("&")).$then(P.filterlist);
        },

        or: function() {
            return nothing.$or(keyword("|")).$then(P.filterlist);
        },

        filterlist: function() {
            return nothing.$or(P.filterlistSeq).$or(P.filter);
        },
        
        filterlistSeq: function() {
            return nothing.$or(P.filter).$then(P.filterlist);
        },

        item: function() {
            return P.simple();
        },

        simple: function() {
            return nothing.$or(identifier()).$then(P.filtertype).$then(identifier());
        },

        filtertype: function() {
            return nothing.$or(P.equal).$or(P.approx).$or(P.ge).$or(P.le);
        },
        
        equal: function() {
            return keyword("=")();
        },

        approx: function() {
            return keyword("~=")();
        },

        ge: function() {
            return keyword(">=")();
        },
        
        le: function() {
            return keyword("<=")();
        }
    };
    
    return P.filter(); 
}();
