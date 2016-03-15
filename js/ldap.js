


// TODO: Make inheritance

/**
 * 
 * 
 */
function Operation(op, sel1, sel2) {
    
    this.op = op;
    this.left = sel1;
    this.right = sel2;
}


Operation.prototype.and = function(otherOperation) {
    return new Operation('&', this, otherOperation)
};


Operation.prototype.or = function(otherOperation) {
    return new Operation('|', this, otherOperation)
};


Operation.prototype.stringify = function() {
    return '(' + this.op + this.left.stringify() + this.right.stringify() + ')';
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


Selector.prototype.and = function(otherSelector) {
    return new Operation('&', this, otherSelector)
};


Selector.prototype.or = function(otherSelector) {
    return new Operation('|', this, otherSelector)
};


Selector.prototype.stringify = function() {
    
    var result = '(';
    if (this.negation) {
        result = result + '!';
    }
    
    result = result + this.field + this.cond + this.value
    result = result + ')'
    return result;
};


function ExprBuilder(param) {
    this.param = param;
}


ExprBuilder.prototype.eq = function(value) {
    
    return new Selector({
        field: this.param,
        cond: '=',
        value: value
    });
};


ExprBuilder.prototype.neq = function(value) {
    
    return new Selector({
        field: this.param,
        cond: '=',
        value: value,
        negation: true
    });
};


function a(param) {
    return new ExprBuilder(param);
}


function an(param) {
   return a(param);
}
