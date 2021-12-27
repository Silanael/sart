// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// FieldData.js - 2021-12-07_01
//
// Field-entry containing def and value.
//

const Sys        = require ("./System");
const Util       = require ("./Util");
const SARTBase   = require ("./SARTBase");
const SARTGroup  = require ("./SARTGroup");



class FieldData extends SARTBase
{    
    FieldObject = null;
    FieldDef    = null;
    FieldValue  = null;


    constructor (def, obj, value)
    {        
        super ();

        if (def == null)
            return Sys.ERR_PROGRAM ("FieldData (): 'def' null!", this);

        if (obj == null)
            return Sys.ERR_PROGRAM ("FieldData (): 'obj' null!", this);

        this.WithName (def.GetFieldName () );
        
        this.FieldDef    = def;
        this.FieldObject = obj;        
        this.FieldValue  = value;
        
    }
    
    GetFieldName   () { return this.GetName ();  }
    GetFieldValue  () { return this.FieldValue;  }
    GetFieldDef    () { return this.FieldDef;    }
    GetStrTopWidth () { return Util.GetTopStrLen (this.GetFieldName (), this.GetFieldValue () ); }

    toString       () { "FieldData '" + this.FieldName + "'"; }

    
}


class FieldDataGroup extends SARTGroup
{  
    GetDefsWithValueState (get_if_value_is_not_null = false)
    {
        const defs = [];
        if (get_if_value_is_not_null)
        {
            for (const d of this.AsArray () )
            {        
                if (d.GetFieldValue () != null)
                    defs.push (d?.GetFieldDef () );
            }
        }
        else
        {
            for (const d of this.AsArray () )
            {        
                if (d.GetFieldValue () == null)
                    defs.push (d?.GetFieldDef () );
            }            
        }
        return defs;
    }
    
    
}



module.exports = { FieldData, FieldDataGroup };