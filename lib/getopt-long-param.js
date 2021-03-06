
function strSplit(str, match, limit) {
    var split    = str.split(match);
    var newSplit = [];
    var i        = 0;

    while ( i < limit - 1 ) {
        newSplit.push( split.shift() );
        i++;
    }
    newSplit.push(split.join(match));
    return newSplit;
}

var getoptLongParam = function (details) {
    this.test     = [];
    this.possible = [];
    this.short    = [];
    this.setNames(details[0]);

    this.parent      = details[1].parent;
    this.description = details[1].description;
    this.on          = details[1].on;
    if (details[1].test) {
        this.test.push(details[1].test);
    }
    if (details[1].paramName) {
        this.paramName = details[1].paramName;
    }
};
getoptLongParam.prototype.version   = '0.1.2';
getoptLongParam.prototype.name      = '';
getoptLongParam.prototype.value     = null;
getoptLongParam.prototype.paramName = null;
getoptLongParam.prototype.negatable = false;
getoptLongParam.prototype.increment = false;
getoptLongParam.prototype.parameter = false;

getoptLongParam.prototype.setNames = function(spec) {
    var parts = spec.split(/(?=[!+=])/);
    var names = parts[0].split(/[|]/);
    var self  = this;

    this.name     = names[0];
    this.possible = names;
    this.short    = [];

    if (parts[1] === '!') {
        this.negatable = true;
    }
    else if (parts[1] === '+') {
        this.increment = true;
    }
    else if (parts[1] && parts[1].substr(0,1) === '=') {
        this.parameter = true;
        var type = parts[1].substr(1);

        if (type && type.substr(0,1) === 'i') {
            self.test.push(function (value) {
                if (''+value === ''+parseInt(value)) {
                    return parseInt(value);
                }
                else {
                    throw '--' + self.name + ' must be an integer\n';
                }
            });
            type = type.substr(1);
            this.paramName = 'int';
        }
        else if (type && ( type.substr(0,1) === 'd' || type.substr(0,1) === 'f') ) {
            self.test.push(function (value) {
                if (''+value === ''+parseFloat(value)) {
                    return parseFloat(value);
                }
                else {
                    throw '--' + self.name + ' must be an number\n';
                }
            });
            type = type.substr(1);
            this.paramName = 'float';
        }
        else {
            this.paramName = 'string';
        }

        if (type) {
            if (type === '@') {
                this.list  = true;
                this.value = [];
            }
            else if (type === '%') {
                this.object = true;
                this.value  = {};
            }
        }
    }

    for ( var i in names ) {
        var name = names[i];
        if ( name.length === 1 ) {
            this.short.push(name);
        }
    }
};

getoptLongParam.prototype.process = function(arg) {
    var self = this;
    var possibleMatch = function(name) {
        if (self.parameter && arg.match(/=/)) {
            return '--' + name === arg.split(/=/, 2)[0];
        }
        return '--' + name === arg;
    };
    var shortMatch = function(name) {
        return '-' + name === arg.substr(0,2);
    };

    var long  = this.possible.reduce(function(prev, cur) { if (possibleMatch(cur)) prev.push(cur); return prev; }, []).length;
    var short = this.short.reduce(function(prev, cur) { if (shortMatch(cur)) prev.push(cur); return prev; }, []).length;
    if ( long || short ) {
        var count = 1;
        if (this.increment) {
            this.value = this.value ? this.value + 1 : 1;
        }
        else if (this.parameter) {
            var value;
            if (arg.match(/=/)) {
                value = strSplit(arg, '=', 2)[1];
            }
            else if (short && arg.length > 2) {
                value = arg.substr(2);
            }
            else if (arguments.length > 1) {
                value = arguments[1];
                count = 2;
            }
            else {
                throw '--' + this.name + ' requires a value\n';
            }

            var key;
            if (this.object) {
                var keyVal = strSplit(value, '=', 2);
                key = keyVal[0];
                value = keyVal[1];
            }

            // run any value tests
            for (var j in this.test) {
                if (this.test[j] instanceof Function) {
                    value = this.test[j](value, key, this.parent, this);
                }
            }

            if (this.list) {
                this.value.push(value);
            }
            else if (this.object) {
                this.value[key] = value;
            }
            else {
                this.value = value;
            }
        }
        else {
            this.value = true;
        }

        if (short && !this.parameter && arg.length > 2) {
            // flag that the bundled parameter should be removed
            count = -1;
        }

        if (this.on) {
            this.on(value, key, this.parent, this);
        }

        return count;
    }
    else if ( this.negatable
        && this.possible.reduce(function(prev, cur) { if ( '--no-' + cur === arg ) prev.push(cur); return prev; }, []).length
    ) {
        this.value = false;

        if (this.on) {
            this.on(value, key, this.parent, this);
        }

        return 1;
    }

    return 0;
};

getoptLongParam.prototype.help = function(spec) {
    var help = this.short.length ? '  -' + this.short[0] : '    ';

    var last = this.possible.length - 1;
    while (this.possible[last] && this.possible[last].length === 1) {
        last--;
    }
    if (this.possible[last]) {
        help = help + ' --' + this.possible[last];
    }

    if (this.parameter) {
        help = help + '[=]' + this.paramName;
    }

    while (help.length < 16) {
        help = help + ' ';
    }
    if (help.length > 16) {
        help = help + '\n                ';
    }
    return help + this.description + '\n';
};

var exports;
exports.param = getoptLongParam;
