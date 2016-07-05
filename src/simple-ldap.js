(function(global) {

    'use strict';

    /**
     * Base trait for LDAP query components
     * @constructor
     */
    function LdapEntryTrait() {
    }


    /**
     * LDAP Filter
     * @param expr.attr
     * @param expr.filtertype
     * @param expr.value
     * @constructor
     */
    function LdapFilter(expr) {

        this.attr = expr.attr;
        this.filtertype = expr.filtertype;
        this.value = expr.value;
    }


    /**
     * List of LDAP {LdapEntryTrait} implementations.
     * @param op operation to concat with
     * @param seq {Array} of implementations of {LdapSyntaxEntryTrait}
     * @constructor
     */
    function LdapFilterList(op, seq) {

        this.op = op;
        this.seq = seq;
    }


    /**
     * Naive optimizer for LDAP filter lists
     * @param op list's operand
     * @param array {Array} of {LdapSyntaxEntryTrait} implementations
     * @constructor
     */
    function LdapFilterListOptimization(op, array) {

        this.op = op;
        this.accumulator = [];

        this.slice = array.slice();
    }


    LdapFilterListOptimization.prototype = {

        ordering: function(a, b) {
            return a.getOrdering() - b.getOrdering();
        },

        /**
         * Unfolds all nested {LdapFilterList} values with the same logical op property
         * @returns {*} generator over relaxed values
         */
        doRelaxation: function () {

            const self = this;
            function relax(array) {

                let result = [];
                let proceed = false;
                for (let i=0, length = array.length; i < length; i++) {

                    let that = array[i];
                    if (that instanceof LdapFilterList && that.op === self.op) {
                        proceed = true;
                        result = result.concat(that.seq)
                    } else {
                        result.push(that);
                    }
                }

                if (proceed) {
                    return relax(result);
                } else {
                    return result;
                }
            }

            const relaxed = relax(this.slice.slice());
            relaxed.sort(self.ordering);

            return function* () {

                const length = relaxed.length;
                for (let i = 0; i < length; i++) {
                    yield relaxed[i];
                }
            }
        },

        newMerger: function(item) {

            if (item instanceof LdapFilterList) {
                return this.newListMerger(item);
            } else {
                return this.newDefaultMerger(item);
            }
        },


        /**
         * Builds merger function specific to handle {LdapFilterList} stream value
         * @param fl {LdapFilterList} object which represents current cursor position
         * @returns {Function}  which accepts next value for merging
         */
        newListMerger: function(fl) {

            const self = this;
            const filterList = fl;

            return function(other) {

                if (other instanceof LdapFilterList && filterList.op === other.op) {

                    const newFilterList = new LdapFilterList(filterList.op, filterList.seq.concat(other.seq));
                    return { proceed: true, state: self.newListMerger(newFilterList) };
                } else {
                    return { proceed: false, result: filterList};
                }
            };
        },


        /**
         * Builds default all-purpose merger function
         * @param some value to be wrapped with merger function
         * @returns {Function} which accepts next value for merging
         */
        newDefaultMerger: function(some) {

            const someStuff = some;
            return function () {
                return { proceed: false, result: someStuff };
            };
        },


        /**
         * Fires optimization task. It may look clumsy. But, anyway, it should work :)
         */
        perform: function() {

            let m = null; // Merger function
            let stream = this.doRelaxation()();
            while(true) {

                let nextVal = stream.next();
                if (nextVal.done) {

                    if (m) {
                        let result = m.call(this, 0).result;
                        this.accumulator.push(result);
                    }
                    break;
                }

                if (m) {

                    const merged = m(nextVal.value);
                    if (merged.proceed) {
                        m = merged.state;
                    } else {

                        this.accumulator.push(merged.result);
                        m = this.newMerger(nextVal.value);
                    }
                } else {
                    m = this.newMerger(nextVal.value);
                }
            }

            // TODO: Still, there is a way to do it in less error prone way, therefore will see later how it goes
            if (this.accumulator.length == 1 && this.accumulator[0] instanceof LdapFilterList) {
                return this.accumulator[0]
            } else {
                return new LdapFilterList(this.op, this.accumulator);
            }
        }
    };


    LdapEntryTrait.prototype = {

        /**
         * Concatenates two entries through '&'
         * @param that other instance of operation
         * @returns {LdapFilterList} composite of 'this' and that
         */
        and: function(that) {
            return new LdapFilterList('&', [this, that]);
        },

        /**
         * Concatenates two entries through '|'
         * @param that
         * @returns {LdapFilterList} composite of 'this' and that
         */
        or: function(that) {
            return new LdapFilterList('|', [this, that]);
        },

        /**
         * Builds negation object
         * @returns {LdapFilterList} representing negation of current object
         */
        not: function() {
            return new LdapFilterList('!', [this]);
        },

        /**
         * Tries to optimize this value
         */
        optimize: function() {

            if (this instanceof LdapFilterList) {

                const toOptimized = function(value) {
                    return value.optimize();
                };
                const seqOfOptimized = this.seq.map(toOptimized);
                return new LdapFilterListOptimization(this.op, seqOfOptimized).perform();

            } else {

                // Others are not aware of optimization :)
                return this;
            }
        },

        /**
         * Abstract (This function is Trait implementation specific.)
         * @returns {string} representation of entry
         */
        toString: function() {
            throw new Error("Abstract function call");
        },

        /**
         * @returns {number} representation of entry. It helps to sort items for further optimization
         */
        getOrdering: function() {

            // Assume this value to the greatest among all possible. :)
            return 100000;
        }
    };


    LdapFilterList.prototype = Object.create(LdapEntryTrait.prototype, {

        // Override
        toString: {

            value: function() {

                function toStr(value) {
                    return value.toString();
                }

                return '(' + this.op + this.seq.map(toStr).join("") + ')';
            },
            enumerable: true,
            configurable: true,
            writable: true
        },

        getOrdering: {

            value: function() {

                // We want FilerLists with the same concatenation operand to have the same ordering value
                return 100 + this.op.charCodeAt(0);
            },
            enumerable: true,
            configurable: true,
            writable: true
        },


        // New definitions
        isNot: {

            value: function() {
                return this.op === '!';
            },
            enumerable: true,
            configurable: true,
            writable: true
        }
    });


    LdapFilterList.prototype.constructor = LdapFilterList;


    LdapFilter.prototype = Object.create(LdapEntryTrait.prototype, {

        // Override
        toString: {

            value: function() {

                let result = '(';
                result = result + this.attr + this.filtertype + this.value;
                result = result + ')';
                return result;
            },
            enumerable: true,
            configurable: true,
            writable: true
        }
    });


    LdapFilter.prototype.constructor = LdapFilter;


    function LdapFilterBuilder(param) {
        this.param = param;
    }

    LdapFilter.New = function(name) {
        return new LdapFilterBuilder(name);
    };


    LdapFilterBuilder.prototype = {

        _mkItem: function(filtertype, value) {

            return new LdapFilter({
                attr: this.param,
                filtertype: filtertype,
                value: value
            });
        },

        _escape: function(value) {

            return value.split('').map(function(char) {

                switch (char) {
                    case '(':  return "\\28";
                    case ')':  return "\\29";
                    case '*':  return "\\2a";
                    case '\\': return '\\5c';
                    case '/':  return "\\2f";
                    default:   return char;
                }
            }).join('')
        },

        /**
         * Builds (field=value) checker
         * @param value
         * @returns {LdapFilterList} representation of (field=value)
         */
        eq: function(value) {
            return this._mkItem("=", this._escape(value));
        },

        /**
         * Builds (attr=*)
         * @returns {LdapFilter}
         */
        isPresent: function() {
            return this._mkItem("=", "*");
        },

        /**
         * Builds (attr >= value) checker
         * @param value
         * @returns {LdapFilter}
         */
        ge: function(value) {

            return this._mkItem(">=", this._escape(value));
        },

        /**
         * Builds (attr<=value) checker
         * @param value
         * @returns {LdapFilter}
         */
        le: function(value) {
            return this._mkItem("<=", this._escape(value));
        },

        /**
         * Builds (attr~=value) checker
         * @param value
         * @returns {LdapFilter}
         */
        apx: function(value) {
            return this._mkItem("~=", this._escape(value));
        }
    };


    // Parser implementation

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

        let length = str.length;
        let identifier=false;
        let accumulator=[];

        for (let i = 0, len = length ; i < len; i++) {

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
     *
     * @param tuple
     * @returns {*|LdapFilterList}
     */
    Tuple.toLdapNegation = function(tuple) {
        return tuple._2.not();
    };


    /**
     * Tries to build {LdapItem} from {Tuple} object
     * @param tuple tuple to be transformed
     * @returns {LdapFilter}
     */
    Tuple.toLdapItem = function(tuple) {

        return new LdapFilter({
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
         * produces composite type `A ~ B`. it will succeed if both parsers succeed on given input. Composite type is represented by {Tuple}
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
                    } else {
                        // TODO: What now?
                        throw new Error("Come up with some idea")
                    }
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
                return nothing.or(P.and).or(P.or).or(P.not).or(P.item);
            },

            and: function() {
                return nothing.or(keyword("&")).then(P.filterlist)
                    .map(Tuple.toLdapFilterList);
            },

            or: function() {
                return nothing.or(keyword("|")).then(P.filterlist)
                    .map(Tuple.toLdapFilterList);
            },

            not: function() {
                return nothing.or(keyword("!")).then(P.filter)
                    .map(Tuple.toLdapNegation);
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


    // Exports
    function exportObjects(oxy) {

        oxy.LdapEntryTrait = LdapEntryTrait;
        oxy.LdapFilter = LdapFilter;
        oxy.LdapFilterList = LdapFilterList;

        oxy.LdapParser = LdapParser;
        oxy.ldapTokenizer = tokenizer;
        return oxy;
    }


    // Exports to browser's global context
    if (global.window) {

        if (!global.window.hasOwnProperty("Oxy")) {
            global.window.Oxy = {};
        }

        global.window.Oxy = exportObjects(global.window.Oxy);
    }


    if (typeof module !== "undefined" && module && module.exports) {
        module.exports = exportObjects({});
    }

})(function() { return this; } ());
