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
const SARTGroup  = require ("./SARTGroup");
const OutputArgs = require ("./Output").OutputParams;
const FieldGroup = require ("./FieldGroup");


class SARTObject extends SARTBase
{
    Valid              = true;
    DataLoaded         = false;

    Errors             = null;
    Warnings           = null;
    
    Fields             = null;
    FieldGroups        = null;

    // ***

    static FIELDS                  = new SARTGroup ();
    static FIELDGROUPS             = [FieldGroup.Default, FieldGroup.All, FieldGroup.NotNull, FieldGroup.Null, FieldGroup.None];
    static FIELDS_DEFAULTS         = { list: null, entry: null};
    static FIELDS_SETTINGKEYS      = { list: null, entry: null};
    
    static GET_ALL_FIELD_DEFS           ()     { return this.FIELDS; }
    static GET_ALL_FIELDNAMES           ()     { return this.FIELDS?.GetNamesAsArray (); }
    static GET_SETTING_FIELDNAMES       (mode) { return this.FIELDS_SETTINGKEYS[mode] != null ? Sys.GetMain().GetSetting (this.FIELDS_SETTINGKEYS[mode]) : null; }    
    static GET_DEFAULT_FIELDNAMES       (mode) { return this.FIELDS_DEFAULTS[mode]; }
    static GET_EFFECTIVE_FIELDNAMES     (mode)
    { 
        const s = this.GET_SETTING_FIELDNAMES (mode);
        if (s != null)
            return s;
        else
        {
            const d = this.GET_DEFAULT_FIELDNAMES (mode);
            return d != null ? d : this.GET_ALL_FIELDNAMES ();
        }
    }

    constructor (name = null)
    {
        super (name);

        this.Name        = name;
        this.Fields      = this.constructor.FIELDS      != null ? this.constructor.FIELDS      : new SARTGroup ();
        this.FieldGroups = this.constructor.FIELDGROUPS != null ? this.constructor.FIELDGROUPS : [];
    }


    WithField          (field_def)                             { this.Fields.Add    (   field_def ); return this;                                             }
    WithFields         (...field_defs)                         { this.Fields.AddAll (...field_defs); return this;                                             }
    OnWarning          (warning, src, opts)                    { return this.__OnError ("Warnings", Sys.WARN, warning, src, opts)                             }  
    OnError            (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)                             }  
    OnOverridableError (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR_OVERRIDABLE,  error,   src, opts)                 }  
    OnErrorOnce        (error,   src, opts)                    { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)                             }  
    OnProgramError     (error,   src, opts = { once: false })  { return this.__OnError ("Errors",   Sys.ERR,  error,   src, opts)                             }
    HasWarnings        ()                                      { return this.Warnings?.length > 0;                                                            }
    HasErrors          ()                                      { return this.Errors  ?.length > 0;                                                            }    
    GetRecursiveFields ()                                      { return this.RecursiveFields;                                                                 }
    IsValid            ()                                      { return this.Valid == true;                                                                   }
    SetInvalid         ()                                      { this.Valid = false; return this;                                                             }
    toString           ()                                      { return this.Name != null ? this.Name : "SARTObject"; }


    GetFlagInt ()
    {
        let flags = 0;
        
        if (this.HasErrors   () ) flags |= CONSTANTS.FLAGS.HASERRORS;
        if (this.HasWarnings () ) flags |= CONSTANTS.FLAGS.HASWARNINGS;

        return flags;
    }


    GetEffectiveFieldNames (mode) { return this.constructor.GET_EFFECTIVE_FIELDNAMES (mode); }    
    GetEffectiveFieldDefs  (mode)
    {         
        const field_names = this.GetDefaultFieldNames (mode);
        return Util.IsSet (field_names) ? this.GetFieldDefs (field_names) : null; 
    }

    GetAllFieldDefs  () {  return this.constructor.GET_ALL_FIELD_DEFS (); }
    GetAllFieldNames () { return this.GetAllFieldDefs ()?.GetNamesAsArray (); }
    


    GetFieldDefs (field_names = [], mode = "entry") 
    { 
        
        if (field_names == null || field_names.length <= 0)
            field_names = this.GetEffectiveFieldNames (mode);

        // A special case where only positives and/or negatives are given.
        else if (field_names.find (e => !e.startsWith ("-") && !e.startsWith ("+") ) == null)        
            field_names = this.GetEffectiveFieldNames (mode)?.concat (field_names);
        

        if (field_names == null)
        {
            Sys.DEBUG ("'field_names' null, using all fields.");
            field_names = this.GetAllFieldNames ();
        }

        // Process groups    
        const groups_included = [];
        for (const fname of field_names)
        {
            const group = this.GetFieldGroup (fname);
            if (group != null)
            {                
                const fnames = group.GetFieldNames (this, mode);

                if (fnames == null)
                    Sys.DEBUG ("No valid fields from fieldgroup '" + group + "'.");

                else
                {
                    Sys.DEBUG ("Adding fields from FieldGroup " + group + "...");
                    groups_included.push (...fnames);                    
                }                
            }        
            else            
                groups_included.push (fname);                   
        }     
                

        // Get negates
        const negates = [];
        const no_negates = [];
        for (const fname of groups_included)
        {
            if (fname != null)
            {
                if (fname.startsWith ("-") )            
                    negates.push (fname.slice (1) );            

                else
                    no_negates.push (fname.startsWith ("+") ? fname.slice (1) : fname);                
            }
        }
        

        // Process names
        const field_defs = new SARTGroup ();
        for (const fname of no_negates)
        {
            const def = this.GetFieldDef (fname);

            if (def == null)
                this.OnError ("Field '" + fname + "' does not exist.");

            else
            {
                let negated = false;
                for (const neg of negates)
                {
                    const ndef = this.GetFieldDef (neg);

                    if (ndef == null)
                        this.OnError ("Negated field '" + neg + "' does not exist.");

                    else if (def == ndef)                    
                    {
                        negated = true;
                        break;
                    }
                        
                }
                if (!negated)
                {
                    Sys.DEBUG ("Adding field def " + def);
                    field_defs.Add (def);
                }
                else
                    Sys.DEBUG ("Adding field def " + def + " negated - not adding.");
            }
        }     

        return field_defs;                
    }

    GetFieldDef (field_name, case_sensitive = false)
    {                    
        for (const f of this.constructor.FIELDS?.AsArray () )
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
    

    GetDataForFields (fields = new SARTGroup () )
    {
        const field_data = new FieldDataG ();

        // Parameter omitted, include all defined fields.
        if (fields == null || fields.GetAmount () <= 0)
        {
            Sys.VERBOSE ("No field-list provided - displaying all of them.");
            
            for (const fname of this.constructor.FIELDS?.AsArray () )
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
        else for (const f of fields.AsArray () )
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


    static FROM_JSOBJ (js_obj, name = null)
    {
        if (js_obj == null)
            return null;

        else
        {
            const sart_obj = new SARTObject (name);
            for (const e of Object.entries (js_obj) )
            {
                const key = e[0];
                const val = e[1];

                sart_obj[key] = val;
                sart_obj.WithField (new FieldDef (key) );
            }
            return sart_obj;
        }
    }

 

}


module.exports = SARTObject;