// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputField.js - 2021-12-07_01
//
// Output field definition.
//
// The resolve-order is as follows:
//   GetterFunction -> SARTObject[FromObjectName][FieldName] -> SARTObject[FieldName]
//

const Util       = require ("./Util");
const SARTBase   = require ("./SARTBase");
const FetchDef   = require ("./FetchDef");
const Sys        = require("./System");


class FieldDef extends SARTBase
{        
    PropertyName        = null; // Actual property name of the object. If null, use FieldName.

    FromObjectName      = null;
    GetterFunction      = null;  // This should be a function that takes the SARTObject as its first parameter.

    NullDisplayValue    = "-"    // This applies only to raw text output.

    Recursive           = false;
    RecursiveDepth      = 1;
    
    FetchRequired_AnyOf = [];
    FetchInheritFrom    = null;  // Field name
    Class               = null;

    constructor (name, sartobj_class)
    {
        super (name);
        this.Class = sartobj_class;
    }
    
    
    WithFunction         (func)           { this.GetterFunction      = func;                                                               return this; }    
    WithNullDisplayValue (str)            { this.NullDisplayValue    = str;                                                                return this; }
    WithFetch            (fetchdef)       { if (! this.FetchRequired_AnyOf.includes (fetchdef) ) this.FetchRequired_AnyOf.push (fetchdef); return this; }
    WithFetch_AnyOf      (...fetchdefs)   { Util.AppendToArrayNoDupes (fetchdefs, this.FetchRequired_AnyOf);                               return this; }
    WithInheritFetch     (field_name)     { this.FetchInheritFrom = field_name;                                                            return this; }
    GetFetches_AnyOf     ()               { return this.FetchInheritFrom != null ? this.Class.GET_ALL_FIELD_DEFS ()
                                                                                       .GetByName (this.FetchInheritFrom)?.GetFetches_AnyOf ()
                                                                                 : this.FetchRequired_AnyOf;                                            }        
    UsesFetch            (fetchdef)       { return this.GetFetches_AnyOf ()?.includes (fetchdef);                                                       }
    RequiresFetches      ()               { return this.GetFetches_AnyOf ()?.length > 0; }

    WithRecursive (depth = 1)
    {
        this.Recursive      = true;
        this.RecursiveDepth = depth;
        return this;
    }


    GetFieldName       ()                              { return this.GetName (); }
    GetPropertyName    ()                              { return this.PropertyName != null ? this.PropertyName : this.GetFieldName (); }    
    IsFieldPresent     (sart_obj)                      { return this.GetFieldValue (sart_obj) != null; }
    GetRequiredFetches ()                              { return this.RequiredDataFetches; }    


    GetFieldValue (sart_obj)
    {
        const property_name    = this.GetPropertyName ();
        const src_object       = this.FromObjectName != null ? sart_obj[this.FromObjectName] : sart_obj;

        const value = this.GetterFunction != null ? this.GetterFunction (sart_obj)
                                                  : src_object [property_name];                                                                                

        if (value != null)
            return this.Recursive ? value.GetInfo != null ? value.GetInfo () : value 
                                  : value.toString (); 
                        
    }

    /** Returns the value if not null, NullDisplayValue otherwise. */
    GetFieldTextValue (sart_obj)
    {
        const val = this.GetFieldValue (sart_obj);
        return val != null ? val : this.NullDisplayValue;
    }
    
    GetRequiredFetches ()
    {
        const fetches = [].concat (this.Fetches_AllOf);
        for (const f of this.Fetches_AnyOf)
        {

        }
    }

}


module.exports = FieldDef;