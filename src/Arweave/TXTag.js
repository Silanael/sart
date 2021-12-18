//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// TXTag.js - 2021-11-28_01
// Transaction-tag handling
//

const Util       = require('../Util.js');
const Sys        = require('../System.js');
const SARTObject = require ("../SARTObject");


class TXTag extends SARTObject
{
    Value = null;

    constructor (name, value) { super (name); this.Name = name; this.Value = value; }

    toString     () { return this.Name + ":" + this.Value; }
    
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


    HasValueRegex (value_regex, case_sensitive = true)
    {
        if (value_regex == null)
            return this.Value == value_regex;

        return Util.StrCmp_Regex (value_regex, this.Value, !case_sensitive);
    }


}


module.exports = TXTag;