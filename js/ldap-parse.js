
(function(global) {

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
     * Tuple
     */
    function Tuple(val1_, val2_) {
        this._1 = val1_;
        this._2 = val2_;
    }


    Tuple.prototype = {

        /**
         * Tuple structure equality check
         * @param that {object} to be compared with
         */
        equals: function(that) {

            function eq(left, right) {
                return (left instanceof Tuple ? left.equals(right) : left === right);
            }

            if (that instanceof Tuple) {
                return eq(this._1, that._1) && eq(this._2, that._2)
            } else {
                return false;
            }
        }
    };


    /**
     * Tries to build {LdapFilterList} from {Tuple} object
     * @param tuple to be transformed
     * @returns {LdapFilterList}
     */
    Tuple.toLdapFilterList = function(tuple) {
        return new LdapFilterList(tuple._1, tuple._2);
    };


    /**
     * Tries to build {LdapItem} from {Tuple} object
     * @param tuple tuple to be transformed
     * @returns {LdapItem}
     */
    Tuple.toLdapItem = function(tuple) {

        return new LdapItem({
            attr: tuple._1._1,
            filtertype: tuple._1._2,
            value: tuple._2
        });
    };


    /**
     * Tries to build {LdapSyntaxEntryTrait} from {Tuple} object
     * @param tuple tuple to be transformed
     * @returns {*}
     */
    Tuple.toLdapFilter = function(tuple) {
        return tuple._1._2;
    };


    /**
     * Abstract parser. Allows to build complex parsers by combining together primitive parsers
     * @param impl {function()} which accepts input stream of tokens and returns some
     * parse result.
     * @constructor
     */
    function AbstractParser(impl) {
        this.f = impl;
    }


    /**
     * Produces parser which always succeeds
     * @param value result of successful parser
     * @returns {AbstractParser} which always succeeds
     * @constructor
     */
    AbstractParser.Success = function(value) {

        return new AbstractParser(function(input) {

            return {
                success: true,
                value: value,
                input: input
            }
        });
    };


    /**
     * Produces parser which always fails on any input
     * @param message {string} message of failure
     * @returns {AbstractParser} which always fails
     * @constructor
     */
    AbstractParser.Failure = function(message) {

        return new AbstractParser(function() {
            return { success: false, error: message };
        });
    };


    AbstractParser.prototype = {

        /**
         * Tries to parse given string value to any implementation of {LdapSyntaxEntryTrait}
         * @param str {string} string query
         * @return parse result.
         *
         *   It could be successful:
         *   {
         *       success: true,
         *       value: {LdapFilterList},
         *       input: {StreamWrapper}
         *   }
         *
         *   ... or it could be failure:
         *   {
         *       success: false,
         *       error: "Error message goes here",
         *       input: {StreamWrapper}
         *   }
         */
        parse: function(str) {

            const stream = StreamWrapper.fromArray(Array.from(tokenizer(str)));
            return this.$parse(stream);
        },


        $parse: function(input) {
            return this.f.call(this, input);
        },


        /**
         * Combines `this` as AbstractParser[A] and result of `other` function which is AbstractParser[B] into AbstractParser[A | B] which
         * can produce value of type A, value of type B or failure.
         * @param other {function} which produces some AbstractParser[B] i.e. () -> AbstractParser[B]
         * @returns {AbstractParser}
         */
        or: function(other) {

            const self = this;
            return new AbstractParser(function(input) {

                let leftResult = self.$parse(input);
                if (leftResult.success) return leftResult;
                else return other().$parse(input)
            });
        },


        /**
         * Combines `this` as AbstractParser[A] and result of `other` function which is AbstractParser[B] into AbstractParser[A ~ B] which
         * produces composite type `A ~ B`. it will succeed if both parsers succeeded on given input. Composite type is pepresented by {Tuple}
         * object.
         * @param other {function} which produces some AbstractParser[B] i.e. () -> AbstractParser[B]
         * @returns {AbstractParser}
         */
        then: function(other) {

            const self = this;
            return new AbstractParser(function(input) {

                let leftResult = self.$parse(input);
                if (leftResult.success) {

                    let rightResult = other().$parse(leftResult.input);
                    if (rightResult.success) {
                        return {
                            success: true,
                            value: new Tuple(leftResult.value, rightResult.value),
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
         * Transforms `this` as AbstractParser[A] to AbstractParser[B]
         * @param f a function A -> B
         * @returns {AbstractParser}
         */
        map: function(f) {

            const self = this;
            return new AbstractParser(function (input) {

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
         * Transforms `this` as AbstractParser[A] to AbstractParser[Array[A]]
         * @return {AbstractParser}
         */
        times: function() {

            const self = this;
            return self.then(function() { return self.times(); })
                .map(function(p) {

                    if (p instanceof Tuple) {
                        return [p._1].concat(p._2)
                    }
                    else { throw new Error("Come up with some idea") }
                })
                .or(function() { return AbstractParser.Success([]); });
        }
    };


    /**
     * Parser instance. It is immutable and always produces the same result on the same
     * input. Of course if you will not corrupt it :). To know how to access it see export
     * stuff below.
     */
    const LdapParser = function() {

        function token(value, p) {

            return function() {

                return new AbstractParser(function(input) {

                    let result = { success: false, error: "expected " + value, input: input };

                    if (!input.isEmpty() && p(input.head())) {
                        result = { success: true, value: input.head().value, input: input.tail(), error: null };
                    }
                    return result;
                });
            }
        }

        /* Grammar primitives */
        const nothing = AbstractParser.Failure("Not a case");

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
        const P = {

            filter: function() {

                return nothing.or(keyword("(")).then(P.filtercomp).then(keyword(")"))
                    .map(Tuple.toLdapFilter);
            },

            filtercomp: function() {
                return nothing.or(P.and).or(P.or).or(P.item);
            },

            and: function() {
                return nothing.or(keyword("&")).then(P.filterlist)
                    .map(Tuple.toLdapFilterList);
            },

            or: function() {
                return nothing.or(keyword("|")).then(P.filterlist)
                    .map(Tuple.toLdapFilterList);
            },

            filterlist: function() {

                return nothing.or(P.filterlistSeq).or(P.filter);
            },

            filterlistSeq: function() {
                return P.filter().times();
            },

            item: function() {
                return P.simple().map(Tuple.toLdapItem);
            },

            simple: function() {
                return nothing.or(identifier()).then(P.filtertype).then(identifier());
            },

            filtertype: function() {
                return nothing.or(P.equal).or(P.approx).or(P.ge).or(P.le);
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


    // Export to browser's global context
    if (global.window) {

        if (!global.window.hasOwnProperty("Oxy")) {
            global.window.Oxy = {};
        }

        global.window.Oxy.LdapParser = LdapParser;
        global.window.Oxy.ldapTokenizer = tokenizer;
    }

    // TODO: Add export to node.js context

})(function() { return this; } ());
