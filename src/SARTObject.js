//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTObject.js - 2021-11-29_01
// A generic object with the basic functionality
//

const Sys      = require ("./System.js");
const Util     = require ("./Util.js");


class SARTObject
{
    Name             = null;
    
    Valid            = true;
    DataLoaded       = false;

    Errors           = null;
    Warnings         = null;

    OutputFields      = [];
    OutputFieldGroups = [];
    InfoFields        = ["Valid", "Warnings", "Errors"];
    NoInfoFields      = ["NoInfoFields", "CustomFieldFuncs"];
    RecursiveFields   = {"Warnings": {}, "Errors": {} };

    CustomFieldFuncs = {};

    Main             = null;

    constructor (main, name = null)
    {
        this.Main = main;
        this.Name = name;
    }


    OnWarning          (warning, src, opts)                    { return this.__OnError ("Warnings", Sys.WARN, warning, src, opts)            }  
    OnError            (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }  
    OnErrorOnce        (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }  
    OnProgramError     (error,   src, opts = { once: false })  { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }
    HasWarnings        ()                                      { return this.Warnings?.length > 0;                                           }
    HasErrors          ()                                      { return this.Errors  ?.length > 0;                                           }
    SetInfoFields      (fields)                                { this.InfoFields = fields;                                                   }
    WithInfoField      (field)                                 { this.InfoFields = Util.AppendToArray (this.InfoFields, field); return this; }
    GetID              ()                                      { return null; }
    GetName            ()                                      { return this.Name; }
    GetRecursiveFields ()                                      { return this.RecursiveFields;                                                }
    IsValid            ()                                      { return this.Valid == true;                                                  }
    SetInvalid         ()                                      { this.Valid = false; return this;                                            }
    toString           ()                                      { return this.Name != null ? this.Name : "SARTObject"; }

    
    GetField (field, case_sensitive = false)
    {
        if (case_sensitive)
            return this.OutputFields?.[field];

        else
        {
            for (const f of this.OutputFields)
            {
                if (f.MatchesFieldName (field, case_sensitive) )
                    return this.OutputFields[f.GetFieldName () ];
            }
        }
    }

    GetFieldValue (field, case_sensitive = false)
    {
        return this.GetField (field, case_sensitive)?.GetFieldValue ();
    }
    
    
    __SetObjectField (field, value)
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


    /** Excepts a string-array of field-names. */
    GetInfo (fields = [])
    {        
        const info = {};
        const case_sensitive = false;

        // Parameter omitted, include all defined fields.
        if (fields.length <= 0)
        {
            Sys.VERBOSE ("No fields provided - displaying all of them.");
            
            for (const field of this.OutputFields)
            {
                if (field != null)
                    info[field.GetFieldName () ] = field.GetFieldValue (this);
            }
        }

        // Include only the given set of fields.
        else for (const f of fields)
        {      
            const field = this.GetField (f, case_sensitive);

            if (field != null)
                info[field.GetFieldName () ] = field.GetFieldValue (this);

            else
                Sys.ERR ("Unrecognized field: '" + f + "'.");
        }

        return info;
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


    Output (...fields)
    {
        Sys.OUT_OBJ (this.GetInfo (fields), { recursive: this.GetRecursiveFields () } );         
    }

}


module.exports = SARTObject;