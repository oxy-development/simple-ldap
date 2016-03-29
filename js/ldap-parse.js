'use strict';


/**
 * Naive token generator
 * @param str {string} to be decomposed into stream of tokens
 */
function* tokenizer(str) {
    
    function newKeyword(kw) {
        return { type: "keyword", value: kw };
    }
    
    function newIdentifier(value) {
        return { type: "identifier", value: value.trim() };
    }
    
    let identifier=false;
    let accumulator=[];
    
    for (let i = 0, len = str.length ; i < len; i++) {
        
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
                break;
            default:
                
                identifier = true;
                accumulator.push(str[i]);
                break;
        }
    }
}


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


/**
 * Produces immutable stream from array object
 * @param array
 * @returns {StreamWrapper}
 */
StreamWrapper.fromArray = function(array) {
    return new StreamWrapper({ pos: 0, array: array.slice() });
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
 * Tree
 */
function Tree(val1_, val2_) {
    this._1 = val1_;
    this._2 = val2_;
}


Tree.prototype = {
    
    /**
     * Tree structure equality check
     * @param that {object} to be compared with
     */
    equals: function(that) {

        function eq(left, right) {
            return (left instanceof Tree ? left.equals(right) : left === right);
        }

        if (that instanceof Tree) {
            return eq(this._1, that._1) && eq(this._2, that._2)
        } else {
            return false;
        }
    }
};


Tree.toLdapFilterList = function(tree) {
    return new LdapFilterList(tree._1, tree._2);
};


Tree.toLdapItem = function(tree) {

    return new LdapItem({
        attr: tree._1._1,
        filtertype: tree._1._2,
        value: tree._2
    });
};


Tree.toLdapFilter = function(tree) {

    /*
     Expected structure of ${tree}:

            value
          /       \
      ___/_       ')'
     /     \
     '('  ${filter}

     */

    return tree._1._2;
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


/**
 * Produces parser which always succeeds
 * @param value result of successful parser
 * @returns {AbstractLdapParser} which always succeeds
 */
AbstractLdapParser.Success = function(value) {

    return new AbstractLdapParser(function(input) {

        return {
            success: true,
            value: value,
            input: input
        }
    });
};


// TODO:  This stuff is not ready for use. It is just a sketch
AbstractLdapParser.prototype = {

    /**
     *
     * @param str
     */
    parse: function(str) {

        var stream = StreamWrapper.fromArray(Array.from(tokenizer(str)));
        return this.$parse(stream);
    },

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
                        value: new Tree(leftResult.value, rightResult.value),
                        input: rightResult.input
                    };
                } else {
                    return rightResult;
                }
            } else {
                return leftResult;
            }
        });
    },


    /**
     * Transforms Parser Parser[A] to Parser[B]
     * @param f a function A -> B
     * @returns {AbstractLdapParser}
     */
    map: function(f) {

        const self = this;
        return new AbstractLdapParser(function (input) {

            let result = self.$parse(input);
            if (result.success) {

                result = {
                    success: true,
                    value: f.call(self, result.value),
                    input: result.input
                };
            }

            return result;
        });
    },


    /**
     * Produces new parser object which represents sequence
     * @return {AbstractLdapParser}
     */
    times: function() {

        const self = this;
        return self.$then(function() { return self.times(); })
            .map(function(p) {

                if (p instanceof Tree) {
                    return [p._1].concat(p._2)
                }
                else { throw new Error("Come up with some idea") }
            })
            .$or(function() { return AbstractLdapParser.Success([]); });
    }
};


const LdapParser = function() {

    function token(value, p) {

        return function() {

            return new AbstractLdapParser(function(input) {

                let result = { success: false, error: "expected " + value, input: input };
                
                if (!input.isEmpty() && p(input.head())) {
                    result = { success: true, value: input.head().value, input: input.tail(), error: null };
                }
                return result;
            });
        }
    }

    /* Grammar primitives */
    const nothing = new AbstractLdapParser(function() {
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


    /* Products */
    var P = {
        
        filter: function() {

            return nothing.$or(keyword("(")).$then(P.filtercomp).$then(keyword(")"))
                .map(Tree.toLdapFilter);
        },

        filtercomp: function() {
            return nothing.$or(P.and).$or(P.or).$or(P.item);
        },

        and: function() {
            return nothing.$or(keyword("&")).$then(P.filterlist)
                .map(Tree.toLdapFilterList);
        },

        or: function() {
            return nothing.$or(keyword("|")).$then(P.filterlist)
                .map(Tree.toLdapFilterList);
        },

        filterlist: function() {

            return nothing.$or(P.filterlistSeq).$or(P.filter);
        },
        
        filterlistSeq: function() {
            return P.filter().times();
        },

        item: function() {
            return P.simple().map(Tree.toLdapItem);
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
