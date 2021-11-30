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

    GetFieldValue (field)
    {
        const custom = this.CustomFieldFuncs[field];
        return custom == null ? this[field] : custom (this);        
    }

    __SetField (field, value)
    {
        if (field == null)                   
            return this.OnProgramError ("Failed to set field, 'field' provided was null.", "SARTObject.__SetValue");
            
        if (value == null)
            return false;

        const existing = this[field];

        if (!existing)
        {
            this[field] = value;
            return true;
        }

        else if (existing?.toString () != value?.toString () )
            return this.OnError ("Field '" + field + "' already set to '" + existing + "' which is different than new value '" + value 
                                  + "' !", "SARTObject.___SetField");
                    
    }

    Output ()
    {
        Sys.OUT_OBJ (this.GetInfo (), { recursive_fields: this.GetRecursiveFields () } );
    }


    __OnError (field, errfunc, error, src, opts)
    {
        if (!errfunc (error, src, opts) )
        {
            this[field] = Util.AppendToArray (this[field], error, " "); 
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
            // The field name starting with a '?' is an indication that it should
            // only be displayed if its value is not null.
            // Non-questionmarked ones will always be displayed.
            if (f != null && f[0] == "?")
            {
                const field = f.slice (1);
                const val = this.GetFieldValue (field);
                if (val != null)
                    info[field] = val;
            }
            else
                info[f] = this.GetFieldValue (f);
                                    
        }
        return info;
    }
    
}


module.exports = SARTObject;