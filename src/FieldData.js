// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// FieldData.js - 2021-12-07_01
//
// Field-entry containing def and value.
//

const Sys        = require ("./System");


class FieldData
{
    FieldName   = null;
    FieldObject = null;
    FieldDef    = null;
    FieldValue  = null;


    constructor (def, obj, value)
    {        
        if (def == null)
            return Sys.ERR_PROGRAM ("FieldData (): 'def' null!", this);

        if (obj == null)
            return Sys.ERR_PROGRAM ("FieldData (): 'obj' null!", this);

        this.FieldName   = def.GetFieldName ();
        this.FieldDef    = def;
        this.FieldObject = obj;        
        this.FieldValue  = value;
        
    }

    GetFieldName  () { return this.FieldName;  }
    GetFieldValue () { return this.FieldValue; }
    GetFieldDef   () { return this.FieldDef;   }
    toString      () { "FieldData '" + this.FieldName + "'"; }
    
}


module.exports = FieldData;