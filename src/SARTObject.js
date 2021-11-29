//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTObject.js - 2021-11-29_01
// A generic object with the basic functionality
//

const Sys  = require ("./System.js");
const Util = require ("./Util.js");


class SARTObject
{

    Errors           = null;
    Warnings         = null;

    InfoFields       = ["Warnings", "Errors"];
    NoInfoFields     = ["NoInfoFields", "CustomFieldFuncs"];
    RecursiveFields  = ["Warnings", "Errors"];
    CustomFieldFuncs = {};


    OnWarning          (warning, src, opts)                    { return this.__OnError ("Warnings", Sys.WARN, warning, src, opts)            }  
    OnError            (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }  
    OnErrorOnce        (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }  
    OnProgramError     (error,   src, opts = { once: false })  { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }
    HasWarnings        ()                                      { return this.Warnings?.length > 0;                                           }
    HasErrors          ()                                      { return this.Errors  ?.length > 0;                                           }
    SetInfoFields      (fields)                                { this.InfoFields = fields;                                                   }
    WithInfoField      (field)                                 { this.InfoFields = Util.AppendToArray (this.InfoFields, field); return this; }
    GetRecursiveFields ()                                      { return this.RecursiveFields; }

    
    Output ()
    {
        Sys.OUT_OBJ (this.GetInfo (), { recursive_fields: this.GetRecursiveFields () } );
    }


    __OnError (field, errfunc, error, src, opts)
    {
        if (!errfunc (error, src, opts) )
        {
            this[field] = Util.Append (this[field], error, " "); 
            return false;
        }
        else
            return true;        
    }


    GetInfo ()
    {
        const info = {};
        
        for (const f of this.InfoFields)
        {           
            const custom = this.CustomFieldFuncs[f];
            info[f] = custom == null ? this[f] : custom (this);
        }
        return info;
    }
    
}


module.exports = SARTObject;