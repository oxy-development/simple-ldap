
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


AbstractLdapParser.prototype = {

    $parse: function(input) {
        this.f.call(this, input);
    },

    $or: function(other) {

        const self = this;
        return new AbstractLdapParser(function(input) {

            let leftResult = self.$parse(input);
            if (leftResult.success) return leftResult;
            else return other.$parse(input)
        })
    },

    $then: function(other) {

        const self = this;
        return new AbstractLdapParser(function(input) {

            let leftResult = self.$parse(input);
            if (leftResult.success) {

                let rightResult = other.$parse(leftResult.input)
                if (rightResult.success) {
                    return {
                        success: true,
                        value: Seq(leftResult.value, rightResult.value)
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








