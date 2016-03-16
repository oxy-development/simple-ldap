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
     * Abstract (This function is Trait implementation specific.)
     * @returns {string} representation of entry
     */
    toString: function() {
        throw new Error("Abstract function call");
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
    }
});


LdapFilterList.prototype.constructor = LdapFilterList;


/*

 _insert: function(op, that) {

 if (this instanceof FilterList && this.op === op) {

 if (that instanceof FilterList && that.op === op) {
 this.seq = this.seq.concat(that.seq);
 } else {
 this.seq.push(that);
 }
 return this;
 } else {
 return new FilterList(op, [this, that]);
 }
 }


 */





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
