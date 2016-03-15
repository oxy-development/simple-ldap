
'use strict';


/**
 * At this point there is slightly simple implementation of LDAP query library
 * @param op operation to concat with
 * @param sel1 left operation
 * @param sel2 right operation
 * @constructor
 */
function Operation(op, sel1, sel2) {
    
    this.op = op;
    this.left = sel1;
    this.right = sel2;
}


Operation.prototype = {

    /**
     * Concatenates two items through '&'
     * @param otherOperation other instance of operation
     * @returns {Operation} composite of 'this' and otherOperation
     */
    and: function(otherOperation) {
        return new Operation('&', this, otherOperation)
    },

    /**
     * Concatenates two items through '|'
     * @param otherOperation
     * @returns {Operation} composite of 'this' and otherOperation
     */
    or: function(otherOperation) {
        return new Operation('|', this, otherOperation)
    },

    /**
     * Converts this value to string representation of LDAP
     * @returns {string}
     */
    stringify: function() {
        return '(' + this.op + this.left.stringify() + this.right.stringify() + ')';
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

    eq: function(value) {

        return new Selector({
            field: this.param,
            cond: '=',
            value: value
        });
    },
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
