//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// TXTag.js - 2021-11-28_01
// Transaction-tag handling
//

const Util = require('../Util.js');
const Sys  = require('../System.js');


class TXTag
{
    Name  = null;
    Value = null;

    constructor (name, value) { this.Name = name; this.Value = value; }

    toString     () { return this.Name + ":" + this.Value; }
    GetName      () { return this.Name;  }
    GetValue     () { return this.Value; }
    GetSizeBytes () { return Buffer.byteLength (this.Name) + Buffer.byteLength (this.Value); }

    ToGQL () 
    {
        return "{name:\"" + this.Name + "\",values:["
            + (Array.isArray (this.Value) ? Util.ArrayToStr (this.Value, { entry_separator: ",", values_in_quotes: true })
                                          : "\"" + this.Value + "\"")
            + "]}";

    }

    HasValue (value, case_sensitive = true)
    {
        return Util.StrCmp (this.Value, value, !case_sensitive);
    }

}


module.exports = TXTag;