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

//const Util       = require ("./Util");
const SARTBase   = require ("./SARTBase");


class FieldDef extends SARTBase
{        
    PropertyName        = null; // Actual property name of the object. If null, use FieldName.

    FromObjectName      = null;
    GetterFunction      = null;  // This should be a function that takes the SARTObject as its first parameter.

    Recursive           = false;
    RecursiveDepth      = 1;
    
    RequiredDataFetches = [];


    constructor (name)
    {
        super (name);
    }
    
    
    WithFunction        (func)           { this.GetterFunction      = func;        return this; }
    WithRequiredFetches (...fetch_names) { this.RequiredDataFetches = fetch_names; return this; }
    
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

    

}


module.exports = FieldDef;