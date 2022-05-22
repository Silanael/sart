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
const FieldDef   = require ("./FieldDef");



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
            Sys.ERR_PROGRAM_ONCE ("'obj' not given to the constructor!", {src: this} );

        if (name != null)
            this.WithName (name);

        else if (this.Def != null)
            this.WithName (def.GetFieldName () );
    }
    
    GetFieldName       ()     { return this.Def?.GetFieldName ();                                        }
    GetFieldValue      ()     { return this.Def?.GetFieldValue (this.Obj);                               }
    GetFieldTextValue  ()     { return Util.IsSetStrOr (this.GetFieldValue ()?.toString (), "-");        }
    GetFieldDef        ()     { return this.Def                                                          }
    GetTopStrWidth     ()     { return Util.GetTopStrLen (this.GetFieldName (), this.GetFieldValue () ); }

}


class FieldDataGroup extends SARTGroup
{  

    constructor (sartobj)
    {
        super ();

        const field_defs = sartobj?.GetFieldDefsArray?.();

        if (field_defs == null)
            return this.OnProgramError ("Unable to get field defs from 'sartobj' - is either null or not a SART-object.", this);

        for (const fdef of field_defs)
        {
            this.Add (new FieldData (sartobj, fdef) );
        }

    }

    GetField (name_or_def)
    {        
        return this.GetByName (name_or_def instanceof FieldDef ? name_or_def.GetFieldName (): name_or_def); 
    }

    HasField (name_or_def)
    {        
        return this.GetField (name_or_def) != null;
    }

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

    GetFieldValuesJSObj (fields = [])
    {
        const result_jsobj = {};
        const field_array  = this.AsArray ();

        // All fields
        if (fields == null || fields.length <= 0)
        {
            for (const fdata of field_array)
            {                
                result_jsobj [fdata.GetFieldName ()] = fdata.GetFieldValue ();
            }
        }
        else for (const fdata of field_array)
        {
            const fname = fdata.GetFieldName ();
            if (fields.HasName (fdata) )
                result_jsobj [fname] = fdata.GetFieldValue ();
        }

        return result_jsobj;
    }

}



module.exports = { FieldData, FieldDataGroup };