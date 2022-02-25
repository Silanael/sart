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
    Obj   = null;
    Def   = null;
    Value = null;    


    constructor (obj, def, name = null)
    {        
        super ();

        this.Obj = obj;
        this.Def = def;

        if (this.Obj == null)
            Sys.ERR_PROGRAM_ONCE ("'obj' not given to the constructor!", "FieldData");

        if (name != null)
            this.WithName (name);

        else if (this.Def != null)
            this.WithName (def.GetFieldName () );
    }
    
    GetFieldName       () { return this.GetName ();                                                  }
    GetFieldValue      () { return this.Def?.GetFieldValue (this.Obj);                               }
    GetFieldTextValue  () { return Util.IsSetStrOr (this.GetFieldValue ()?.toString (), "-");        }
    GetFieldDef        () { return this.Def                                                          }
    GetTopStrWidth     () { return Util.GetTopStrLen (this.GetFieldName (), this.GetFieldValue () ); }

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