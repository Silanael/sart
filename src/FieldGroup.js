// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputField.js - 2021-12-26_01
//
// A group of fields.
//

const CONSTANTS  = require ("./CONSTANTS");
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
    constructor   ()               { super (); this.WithName ("DEFAULT"); }
    GetFieldNames (sart_obj, mode) { return sart_obj?.GetEffectiveFieldNames (mode); }
}

class FieldGroup_TableMode extends FieldGroup
{
    constructor   ()               { super (); this.WithName ("Table").WithAliases ("AsTable", "As_Table", "AsList", "As_List"); }
    GetFieldNames (sart_obj, mode) { return sart_obj?.GetEffectiveFieldNames (CONSTANTS.LISTMODE_TABLE); }
}

class FieldGroup_SeparateMode extends FieldGroup
{
    constructor   ()               { super (); this.WithName ("Separate").WithAliases ("Sep", "AsSeparate", "AsSep", "As_Sep", "As_Separate"); }
    GetFieldNames (sart_obj, mode) { return sart_obj?.GetEffectiveFieldNames (CONSTANTS.LISTMODE_SEPARATE); }
}

module.exports = { FieldGroup, 
                   All:      new FieldGroup_All          (), 
                   None:     new FieldGroup_None         (), 
                   NotNull:  new FieldGroup_NotNull      (), 
                   Null:     new FieldGroup_Null         (),
                   Default:  new FieldGroup_Default      (),
                   Table:    new FieldGroup_TableMode    (),
                   Separate: new FieldGroup_SeparateMode ()
                 }