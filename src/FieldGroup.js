// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputField.js - 2021-12-26_01
//
// A group of fields.
//

const SARTBase   = require ("./SARTBase");


class FieldGroup extends SARTBase
{
    FieldNames = [];

    /** Overridable */
    GetFieldNames (sart_obj, mode) { return this.FieldNames; }
}


class FieldGroup_All extends FieldGroup
{    
    constructor   ()                   { super (); this.WithName ("ALL");     }
    GetFieldNames (sart_obj)           { return sart_obj.GetAllFieldNames (); }
}

class FieldGroup_None extends FieldGroup
{    
    constructor   ()                   { super (); this.WithName ("NONE");    }
    GetFieldNames (sart_obj)           { return [];                           }
}

class FieldGroup_NotNull extends FieldGroup
{    
    constructor   ()                   { super (); this.WithName ("NOT-NULL").WithAliases ("NON-NULL", "NONULL");  }
    GetFieldNames (sart_obj)           { return sart_obj.GetDataForFields ()?.GetFieldNamesWithValueState (true); }    
}

class FieldGroup_Null extends FieldGroup
{    
    constructor   ()                   { super (); this.WithName ("NULL");  }
    GetFieldNames (sart_obj)           { return sart_obj.GetDataForFields ()?.GetFieldNamesWithValueState (false); }    
}

class FieldGroup_Default extends FieldGroup
{
    constructor   ()               { super (); this.WithName ("DEFAULT").WithAliases ("DEFAULT"); }
    GetFieldNames (sart_obj, mode) { return sart_obj?.GetEffectiveFieldNames (mode); }
}

module.exports = { FieldGroup, 
                   All:     new FieldGroup_All     (), 
                   None:    new FieldGroup_None    (), 
                   NotNull: new FieldGroup_NotNull (), 
                   Null:    new FieldGroup_Null    (),
                   Default: new FieldGroup_Default (), 
                 }