'use strict';


/**
 * Base trait for LDAP query components
 * @constructor
 */
function LdapSyntaxEntryTrait() {
    // Abstract
}


/**
 * LDAP Filter
 * @param expr.field
 * @param expr.cond
 * @param expr.value
 * @param expr.negation
 * @constructor
 */
function LdapFilter(expr) {

    this.field = expr.field;
    this.cond = expr.cond;
    this.value = expr.value;
    this.negation = expr.negation;
}


/**
 * List of LDAP Filters.
 * @param op operation to concat with
 * @param seq {Array} of implementations of {LdapSyntaxEntryTrait}
 * @constructor
 */
function LdapFilterList(op, seq) {

    this.op = op;
    this.seq = seq;
}


/**
 *
 * @param op
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
     * Unfolds all nested {LdapFilterList} values with the same
     * logical op property
     * @returns {*} generator over relaxed values
     */
    doRelaxation: function () {

        const self = this;
        function relax(array) {

            var result = [];
            var proceed = false;
            for (var i=0, length = array.length; i < length; i++) {

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

        var m = null; // Merger function
        let stream = this.doRelaxation()();
        while(true) {

            var nextVal = stream.next();
            if (nextVal.done) {

                if (m) {
                    var result = m.call(this, 0).result;
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


LdapSyntaxEntryTrait.prototype = {

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


LdapFilterList.prototype = Object.create(LdapSyntaxEntryTrait.prototype, {

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
    }
});


LdapFilterList.prototype.constructor = LdapFilterList;


LdapFilter.prototype = Object.create(LdapSyntaxEntryTrait.prototype, {

    // Override
    toString: {

        value: function() {

            var result = '(';
            if (this.negation) {
                result = result + '!';
            }

            result = result + this.field + this.cond + this.value;
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


LdapFilterBuilder.prototype = {

    /**
     * Builds (field=value) checker
     * @param value
     * @returns {LdapFilterList} representation of (field=value)
     */
    eq: function(value) {

        return new LdapFilter({
            field: this.param,
            cond: '=',
            value: value
        });
    },

    /**
     * Builds (!field=value)
     * @param value
     * @returns {LdapFilterList} representation of (!field=value)
     */
    neq: function(value) {

        return new LdapFilter({
            field: this.param,
            cond: '=',
            value: value,
            negation: true
        });
    }
};


function a(param) {
    return new LdapFilterBuilder(param);
}


function an(param) {
   return a(param);
}
