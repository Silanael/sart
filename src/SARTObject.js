//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTObject.js - 2021-11-29_01
// A generic object with the basic functionality
//

const CONSTANTS  = require ("./CONSTANTS");
const Sys        = require ("./System.js");
const Util       = require ("./Util.js");
const FieldData  = require ("./FieldData").FieldData;
const FieldDataG = require ("./FieldData").FieldDataGroup;
const FieldDef   = require ("./FieldDef");
const SARTBase   = require ("./SARTBase");
const OutputArgs = require ("./Output").OutputParams;
const FieldGroup = require ("./FieldGroup");


class SARTObject extends SARTBase
{
    Valid              = true;
    DataLoaded         = false;

    Errors             = null;
    Warnings           = null;

    static FIELDS      = [];
    static FIELDGROUPS = [FieldGroup.All, FieldGroup.NotNull, FieldGroup.Null, FieldGroup.None];

 
    constructor (name = null)
    {
        super (name);
        this.Name = name;
    }


    OnWarning          (warning, src, opts)                    { return this.__OnError ("Warnings", Sys.WARN, warning, src, opts)            }  
    OnError            (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }  
    OnOverridableError (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR_OVERRIDABLE,  error,   src, opts)}  
    OnErrorOnce        (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }  
    OnProgramError     (error,   src, opts = { once: false })  { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)            }
    HasWarnings        ()                                      { return this.Warnings?.length > 0;                                           }
    HasErrors          ()                                      { return this.Errors  ?.length > 0;                                           }    
    GetRecursiveFields ()                                      { return this.RecursiveFields;                                                }
    IsValid            ()                                      { return this.Valid == true;                                                  }
    SetInvalid         ()                                      { this.Valid = false; return this;                                            }
    toString           ()                                      { return this.Name != null ? this.Name : "SARTObject"; }


    GetFlagInt ()
    {
        let flags = 0;
        
        if (this.HasErrors   () ) flags |= CONSTANTS.FLAGS.HASERRORS;
        if (this.HasWarnings () ) flags |= CONSTANTS.FLAGS.HASWARNINGS;

        return flags;
    }

    

    GetFieldDefs (field_names = []) 
    { 
        
        if (field_names == null || field_names.length <= 0)
            return this.constructor.FIELDS; 

        else
        {
            // Process groups
            const final_names = [];

            for (const fname of field_names)
            {
                const group = this.GetFieldGroup (fname);
                if (group != null)
                {
                    Sys.DEBUG ("Adding fields from FieldGroup " + group + "...");
                    final_names.push (...group.GetFieldsInGroup (this) );
                }
                else
                    final_names.push (fname);
            }

            const field_defs = [];
            // Include only the given set of fields.
            for (const fname of final_names)
            {      
                const field = this.GetFieldDef (fname);

                if (field != null)
                    field_defs.push (field);

                else
                    Sys.ERR ("Unrecognized field: '" + fname + "'.");
            }
            return field_defs;
        }
        
    }

    GetFieldDef (field_name, case_sensitive = false)
    {                    
        for (const f of this.constructor.FIELDS)
        {            
            if (f.HasName (field_name, case_sensitive) )
                return f;
        }
        return null;
    }

    GetFieldGroup (group_name, case_sensitive = false)
    {                    
        for (const f of this.constructor.FIELDGROUPS)
        {            
            if (f.HasName (group_name, case_sensitive) )
                return f;
        }
        return null;
    }

    GetFieldValue (field, case_sensitive = false)
    {
        return this.GetFieldDef (field, case_sensitive)?.GetFieldValue (this);
    }
    
    /** Field can be either string or FieldDef. */
    GetFieldData (field)
    {        
        const def = field instanceof FieldDef ? field: this.GetFieldDef (field);

        if (def != null)
            return new FieldData (def, this, def.GetFieldValue (this) );
        else
            return null;
    }
    

    GetDataForFields (fields = [])
    {
        const field_data = new FieldDataG ();

        // Parameter omitted, include all defined fields.
        if (fields == null || fields.length <= 0)
        {
            Sys.VERBOSE ("No field-list provided - displaying all of them.");
            
            for (const fname of this.constructor.FIELDS)
            {
                if (fname != null)
                {
                    let data = this.GetFieldData (fname);

                    if (data != null)
                        field_data.Add (data)
                    else
                        this.OnProgramError ("GetDataForFields: GetFieldData for " + fname + " returned null!");             
                }
                else
                    this.OnProgramError ("Could not fetch field '" + fname + "' even though it's listed as object fields.");
            }
        }

        // Include only the given set of fields.
        else for (const f of fields)
        {      
            const field = this.GetFieldData (f);

            if (field != null)
                field_data.Add (field);

            else
                Sys.ERR ("Unrecognized field: '" + f + "'.");
        }

        return field_data;
    }

    
    __SetObjectProperty (field, value)
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


    Output (output_args = new OutputArgs () )
    {                
        //Sys.OUT_OBJ (this.GetFieldsAsObject (fields), { recursive: this.GetRecursiveFields () } );         
        Sys.GetMain ().OutputObjects (this, output_args);
    }

}


module.exports = SARTObject;