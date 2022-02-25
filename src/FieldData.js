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
    FieldObject    = null;
    FieldDef       = null;
    FieldValue     = null;
    FieldTextValue = null;


    constructor (def, obj, value, textvalue)
    {        
        super ();

        this.WithName (def.GetFieldName () );
        
        this.FieldDef       = def;
        this.FieldObject    = obj;        
        this.FieldValue     = value;
        this.FieldTextValue = textvalue;
        
    }
    
    GetFieldName       () { return this.GetName ();      }
    GetFieldValue      () { return this.FieldValue;      }
    GetFieldTextValue  () { return this.FieldTextValue;  }
    GetFieldDef        () { return this.FieldDef;        }
    GetStrTopWidth     () { return Util.GetTopStrLen (this.GetFieldName (), this.GetFieldValue () ); }

    toString           () { "FieldData '" + this.FieldName + "'"; }

    
}


class FieldDataGroup extends SARTGroup
{  
    GetDefsWithValueState (get_if_value_is_not_null = false)
    {
        const defs = new SARTGroup ();
        if (get_if_value_is_not_null)
        {
            for (const d of this.AsArray () )
            {        
                if (d.GetFieldValue () != null)
                    defs.Add (d?.GetFieldDef () );
            }
        }
        else
        {
            for (const d of this.AsArray () )
            {        
                if (d.GetFieldValue () == null)
                    defs.Add (d?.GetFieldDef () );
            }            
        }
        return defs;
    }
   
    GetFieldNamesWithValueState (get_if_value_is_not_null = false)
    {
        const names = [];
        for (const def of this.GetDefsWithValueState (get_if_value_is_not_null)?.AsArray () )
        {
            names.push (def?.GetName () );
        }
        return names;
    }
}



module.exports = { FieldData, FieldDataGroup };