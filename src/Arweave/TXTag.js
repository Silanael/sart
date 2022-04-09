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
    constructor ( {name, value, tag} )
    { 
        super (tag != null ? tag.GetName (): name); 
        this.Value = tag != null ? tag.GetValue () : value;
        
        if (this.GetName () == null)
            Sys.ERR_PROGRAM ("Attempted to create a tag with 'name' " + (this.Value == null ? "and value " : "") + " as null!", this);
            
        else if (this.Value == null)
            Sys.ERR_PROGRAM ("Attempted to create tag '" + this.GetName () + " with null value!");;
    }    

    toString     () { return this.Name + ":" + this.Value; }
    
    GetValue     () { return this.Value; }
    GetSizeBytes () { return Buffer.byteLength (this.Name) + Buffer.byteLength (this.Value); }
    GetTagName   () { return this.Name;  }
    GetTagValue  () { return this.Value; }


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

    AddToNativeTXObj (ntxobj)
    {
        try
        {
            ntxobj.addTag (this.GetTagName (), this.GetTagValue () );
        }
        catch (exception)
        {
            Sys.DEBUG ("TXTag.AddToNativeTXObj: ntxobj.addTag generated an exception:");
            Sys.DEBUG (exception);
            throw (exception);
        }
    }

}


module.exports = TXTag;