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

const Util = require ("./Util");


class FieldDef
{
    FieldName           = null; // Display name.
    PropertyName        = null; // Actual property name of the object. If null, use FieldName.

    FromObjectName      = null;
    GetterFunction      = null;  // This should be a function that takes the SARTObject as its first parameter.

    Recursive           = false;
    RecursiveDepth      = 1;
    
    RequiredDataFetches = [];


    constructor (name)
    {
        this.FieldName = name;
    }

    WithFunction        (func)           { this.GetterFunction      = func;        return this; }
    WithRequiredFetches (...fetch_names) { this.RequiredDataFetches = fetch_names; return this; }
    
    WithRecursive (depth = 1)
    {
        this.Recursive      = true;
        this.RecursiveDepth = depth;
        return this;
    }


    GetFieldName       ()                              { return this.FieldName; }
    GetPropertyName    ()                              { return this.PropertyName != null ? this.PropertyName : this.FieldName; }    
    IsFieldPresent     (sart_obj)                      { return this.GetFieldValue (sart_obj) != null; }
    MatchesFieldName   (field, case_sensitive = false) { return Util.StrCmp (field, this.FieldName, !case_sensitive); }
    GetRequiredFetches ()                              { return this.RequiredDataFetches; }    


    GetFieldValue (sart_obj)
    {
        const property_name    = this.GetPropertyName ();
        const from_object_name = sart_obj[this.FromObjectName];

        const value = this.GetterFunction != null ? this.GetterFunction (sart_obj)
                                                  : this.FromObjectName != null ? from_object_name ? from_object_name [property_name] : null
                                                                                : sart_obj [property_name];

        if (value != null)
            return this.Recursive ? value.GetInfo != null ? value.GetInfo () : value 
                                  : value.toString (); 
                        
    }

    

}


module.exports = FieldDef;