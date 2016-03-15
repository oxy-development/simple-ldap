
'use strict';


/**
 * At this point there is slightly simple implementation of LDAP query library
 * @param op operation to concat with
 * @param seq {Array}
 * @constructor
 */
function Operation(op, seq) {
    
    this.op = op;
    this.seq = seq;
}


Operation.prototype = {

    _insert: function(op, that) {

        if (this instanceof Operation && this.op === op) {

            if (that instanceof Operation && that.op === op) {
                this.seq = this.seq.concat(that.seq);
            } else {
                this.seq.push(that);
            }
            return this;
        } else {
            return new Operation(op, [this, that]);
        }
    },

    /**
     * Concatenates two items through '&'
     * @param otherOperation other instance of operation
     * @returns {Operation} composite of 'this' and otherOperation
     */
    and: function(otherOperation) {

        return this._insert('&', otherOperation);
    },

    /**
     * Concatenates two items through '|'
     * @param otherOperation
     * @returns {Operation} composite of 'this' and otherOperation
     */
    or: function(otherOperation) {

        return this._insert('|', otherOperation);
    },

    /**
     * Converts this value to string representation of LDAP
     * @returns {string}
     */
    stringify: function() {

        function toStr(value) {
            return value.stringify();
        }

        return '(' + this.op + this.seq.map(toStr).join("") + ')';
    }
};


/**
 * @param expr.field 
 * @param expr.cond
 * @param expr.value
 * @param expr.negation
 */
function Selector(expr) {
    
    this.field = expr.field;
    this.cond = expr.cond;
    this.value = expr.value;
    this.negation = expr.negation;
}


Selector.prototype = Object.create(Operation.prototype, {

    stringify: {

        // Override
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


Selector.prototype.constructor = Selector;


function LDAPExprBuilder(param) {
    this.param = param;
}


LDAPExprBuilder.prototype = {

    /**
     * Builds (field=value) checker
     * @param value
     * @returns {Operation} representation of (field=value)
     */
    eq: function(value) {

        return new Selector({
            field: this.param,
            cond: '=',
            value: value
        });
    },

    /**
     * Builds (!field=value)
     * @param value
     * @returns {Operation} representation of (!field=value)
     */
    neq: function(value) {

        return new Selector({
            field: this.param,
            cond: '=',
            value: value,
            negation: true
        });
    }
};


function a(param) {
    return new LDAPExprBuilder(param);
}


function an(param) {
   return a(param);
}
