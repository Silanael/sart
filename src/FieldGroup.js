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
    FieldsInGroup = [];

    GetFieldsInGroup (sart_obj)
    {

    }
}


class FieldGroup_All extends FieldGroup
{    
    constructor      ()         { super (); this.WithName ("ALL");     }
    GetFieldsInGroup (sart_obj) { return sart_obj.GetFieldDefs (null); }
}

class FieldGroup_None extends FieldGroup
{    
    constructor      ()         { super (); this.WithName ("NONE");    }
    GetFieldsInGroup (sart_obj) { return null;                         }
}

class FieldGroup_NotNull extends FieldGroup
{    
    constructor      ()         { super (); this.WithName ("NOT-NULL");  }
    GetFieldsInGroup (sart_obj) { return sart_obj.GetDataForFields ()?.GetDefsWithValueState (true); }    
}

class FieldGroup_Null extends FieldGroup
{    
    constructor      ()         { super (); this.WithName ("NULL");  }
    GetFieldsInGroup (sart_obj) { return sart_obj.GetDataForFields ()?.GetDefsWithValueState (false); }    
}

class FieldGroup_Default extends FieldGroup
{
    constructor      ()         { super (); this.WithName ("DEFAULT"); }
    GetFieldsInGroup (sart_obj) { sart_obj?.GetDefaultFields (); }
}

module.exports = { FieldGroup, 
                   All:     new FieldGroup_All     (), 
                   None:    new FieldGroup_None    (), 
                   NotNull: new FieldGroup_NotNull (), 
                   Null:    new FieldGroup_Null    (),
                   Default: new FieldGroup_Default (), 
                 }