//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTObject.js - 2021-11-29_01
// A generic object with the basic functionality
//

const CONSTANTS     = require ("./CONSTANTS");
const Sys           = require ("./System.js");
const Util          = require ("./Util.js");
const FData         = require ("./FieldData").FieldData;
const FieldDataG    = require ("./FieldData").FieldDataGroup;
const FieldDef      = require ("./FieldDef");
const SARTBase      = require ("./SARTBase");
const SARTGroup     = require ("./SARTGroup");
const OutputArgs    = require ("./OutputParams");
const FieldGroup    = require ("./FieldGroup");
const FieldList     = require ("./FieldList");
const SARTObjectDef = require ("./SARTObjectDef");


class SARTObject extends SARTBase
{
    static OBJDEF  = null;

    ObjectDef      = null;
    
    Valid          = true;
    DataLoaded     = false;

    Value          = null;
    FieldValues    = null;



    constructor ( {objectdef = null, name = null, value = null} = {} )
    {
        super ({name});
        
        this.ObjectDef = objectdef != null ? objectdef : this.constructor.OBJDEF;

        if (this.ObjectDef == null)
        {
            this.ObjectDef = new SARTObjectDef ();
            this.OnProgramError ("SARTObjectDef not supplied, using a blank one.", this);
            debugger;
        }

        this.Value       = value;        
        this.FieldValues = this.ObjectDef.CreateFieldDataEntries (this);
    }

    static SET_CLASSOBJECTDEF (objdef)                         { this.OBJDEF = objdef; }
    static GET_CLASSOBJECTDEF ()                               { return this.OBJDEF;   }


    WithValue              (value)                                 { this.SetValue (value);              return this;                                             }     
    GetRecursiveFields     ()                                      { return this.RecursiveFields;                                                                 }
    IsValid                ()                                      { return this.Valid == true;                                                                   }
    SetInvalid             ()                                      { this.Valid = false; return this;                                                             }
    GetValue               ()                                      { return this.Value;                                                                           }
    SetValue               (value)                                 { this.Value = value;                                                                          }    
    toString               ()                                      { return this.Name != null ? this.Name : "SARTObject"; }
    
    GetObjectDef           ()                                      { return this.ObjectDef != null ? this.ObjectDef : this.constructor.GET_CLASSOBJECTDEF ();     }

    GetFieldDef            (fieldname)                             { return this.GetObjectDef()?.GetFieldDef (fieldname);                                         }              
    GetEffectiveFieldDefs  (fieldnames = [], listmode = null)      { return this.GetObjectDef()?.GetEffectiveFieldDefs ({fieldnames: fieldnames, listmode: listmode})}

    GetFlagInt ()
    {
        let flags = 0;
        
        if (this.HasErrors   () ) flags |= CONSTANTS.FLAGS.HASERRORS;
        if (this.HasWarnings () ) flags |= CONSTANTS.FLAGS.HASWARNINGS;

        return flags;
    }


    /** Field can be either string or FieldDef. */
    GetFieldData (field)
    {        
        return this.FieldValues.GetByName (field instanceof FieldDef ? field.GetFieldName (): field);        
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
                
            debugger;
        }

        return field_data;
    }
    

    static GET_ALL_UNIQUE_FETCHES_FOR_FIELDDEFS (field_def_group = new SARTGroup () )
    {
        const fetchdefs = [];

        for (const f of field_def_group.AsArray () )
        {            
            if (f != null)
                Util.AppendToArrayNoDupes (f.GetFetches_AnyOf (field_def_group), fetchdefs);
            else
                Sys.ERR_PROGRAM ("Null field included in the parameters.", "GetRequiredFetchesForFieldDefs");
        }

        return new SARTGroup (...fetchdefs);
    }

    static GET_MINIMUM_FETCHES_FOR_FIELDDEFS (field_def_group = new SARTGroup () )
    {
        const max_field_amount  = Math.log2 (Number.MAX_SAFE_INTEGER); // Each field has an increased weight in power-of-two.
        
        const all_fetches        = this.GET_ALL_AVAILABLE_FETCHES ()?.AsArray ();
        const fetches_amount     = all_fetches?.length;
        const field_array        = field_def_group.AsArray ();
        const fetch_weight_sums  = [];
        
        for (const c of all_fetches)
        {
            fetch_weight_sums.push ( {def: c, weight: 0} );
        }

        let fields_with_fetches = 0;
        let index, fieldweight  = 1;
        for (const field of field_array)
        {            
            // Only include fields that require fetching.
            if (field.RequiresFetches () )
            {
                if (Sys.IsDebug () )
                    Sys.DEBUG ("Field " + field.GetName () + " weight " + fieldweight + " fetches: " + field.GetFetches_AnyOf () );

                for (index = 0; index < fetches_amount; ++index)
                {                            
                    if (field.UsesFetch (all_fetches[index]) )
                        fetch_weight_sums[index].weight += fieldweight;                        
                }                
                fieldweight *= 2;
                ++fields_with_fetches;
            }
        }

        const target_weight = fieldweight - 1;
    
        // TODO: Make a BigInt-variant.
        if (fields_with_fetches >= max_field_amount)
        {
            Sys.ERR_ONCE ("Field amount exceeded maximum of " + field_amount + " - using all available fetches.");
            return this.GET_ALL_UNIQUE_FETCHES_FOR_FIELDDEFS (field_def_group);
        }

        // Debug output
        if (Sys.IsDebug () )
        {
            Sys.DEBUG ("Fields with fetches: " + fields_with_fetches +" - Target OR'ed value: " + target_weight);
            Sys.DEBUG ("Sums of weights:")
            let v = 0;
            for (const c of fetch_weight_sums)
            {                
                Sys.DEBUG ("- Fetch '" + c.def.GetName () + "': " + c.weight);
                v |= c.weight;
            }

            if (v == target_weight)
                Sys.DEBUG ("All fetch-weights OR'ed with one another results in " + v + " which equals the target sum - all good.");

            else
            {
                Sys.ERR_PROGRAM ("The sum of fetch-weights " + v + " does NOT equal the target sum of " + target_weight + " - something went wrong!");
                return this.GET_ALL_UNIQUE_FETCHES_FOR_FIELDDEFS (field_def_group);
            }
        }
        
        // Find the minimum, most preferrable combination of fetches that gets all the fields we want.
        // Start from the first fetch (they should be ordered by highest to lowest priority).    

        const fetches = SARTObject.__RECURSIVE_FIND (0, target_weight, [], [].concat (fetch_weight_sums));

        if (fetches == null)
        {
            this.OnProgramError ("Failed to find a working combination of fetches for desired fields - using all.", this, {once: true} );
            fetches = this.GetAllFetches ()?.AsArray ();
        }

        return new SARTGroup (...fetches);
    }    
    
    static __RECURSIVE_FIND (start_value, target_value, sequence, remaining)
    {

        if (Sys.IsDebug () )
            Sys.DEBUG ("Starting search with base sequence " + (sequence.length > 0 ? sequence : "empty") + ", base value " + start_value + ", target value " 
                       + target_value + " and remaining " + remaining + ".");

        if (start_value == target_value)
            return sequence;

        else
        {            
            const len = remaining.length;
            let   weight;
            let   test_value;

            for (let c = 0; c < len; ++c)
            {
                weight     = remaining[c].weight;
                test_value = start_value | weight;
                
                if (Sys.IsDebug () )                                       
                    Sys.DEBUG ("Trying " + (sequence.length > 0 ? sequence : "") + remaining[c].def.GetName () 
                               + " - total weight " + start_value + " | " + weight + " = " + test_value);
                    

                // Exact match if this fetch-def is added.
                if (test_value == target_value)
                {
                    sequence.push (remaining[c].def);

                    if (Sys.IsDebug () )
                        Sys.DEBUG ("Found a viable combination of fetches - " + sequence + " - resulting in desired target value " + target_value);
                    
                    return sequence;
                }
            }

            if (Sys.IsDebug () )
                Sys.DEBUG ("Starting with base sequence of " + sequence + " (base value " + start_value 
                           + "), adding one fetch from " + remaining + " was not sufficient.");

            // No match when adding just one fetch.
            let ret, value, arr;            
            for (let c = 0; c < len; ++c)
            {
                value = start_value | remaining[c].weight;                
                arr = [].concat (remaining);
                arr.splice (c, 1);
                
                ret = SARTObject.__RECURSIVE_FIND (value, target_value, sequence.concat (remaining[c].def), arr);

                if (ret != null)
                    return ret;
            }

            // No match with any combination of the remaining fetches
            return null;
        }
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


    async FetchFields (fields = new SARTGroup () )
    {        
        await this.Fetch (this.GetMinimumFetches (fields) );
    }


    async FetchFieldsWithNames (field_names = [], listmode)
    {        
        if (listmode == null)
            return this.OnProgramError ("'listmode' null.", "FetchFieldsWithNames");

        await this.Fetch (this.GetMinimumFetches (this.GetFieldDefs (field_names)) );
    }



    async FetchFieldsForCMD (cmd)
    {
        await this.FetchFieldsWithNames (cmd.GetEffectiveFields (), cmd.GetEffectiveListMode () );   
    }


    async FetchAll ()
    {
        Sys.DEBUG ("Invoking all fetches.", this);
        await this.Fetch (this.GetAllFetches () );        
    }

    async Fetch (fetch_group = null)
    {
        if (fetch_group == null)
        {
            Sys.ERR_PROGRAM ("Fetches not provided - using all.")
            fetch_group = this.GetAllFetches ();
        }
        
        if (fetch_group.GetAmount () <= 0)
        {
            Sys.VERBOSE ("No fetches required for the chosen field(s).", this);
            return;
        }

        Sys.VERBOSE ("Executing fetches: " + fetch_group.GetNamesAsArray (), this);

        const fetchfuncs = [];
        for (const f of fetch_group.AsArray () )
        { 
            const promise = f.FetchFunc (this);
            fetchfuncs.push (promise); 
            Sys.DEBUG ("Queuing fetch '" + f + "'.", this);
        }

        if (fetchfuncs.length > 0)
        {
            Sys.DEBUG ("Awaiting for " + Util.AmountStr (fetchfuncs.length, "fetch.", "fetches."), this);
            await Promise.all (fetchfuncs); 
        }
        else
            Sys.DEBUG ("No fetches to be performed.", this);      
            
    }

  


    Output (output_args = new OutputArgs () )
    {                
        //Sys.OUT_OBJ (this.GetFieldsAsObject (fields), { recursive: this.GetRecursiveFields () } );         
        Sys.GetMain ().OutputObjects (this, output_args);
    }


    /*
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
                const objkey = "Field_" + key;

                console.log (sart_obj);
                
                sart_obj[objkey] = val;                
                sart_obj.WithField (new FieldDef (key, objkey) );
            }
            return sart_obj;
        }
    }
    */
 

}


module.exports = SARTObject;