//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// FieldList.js - 2022-01-21
//
// List of fields.
//

const SARTGroup = require ("./SARTGroup");

class FieldList extends SARTGroup
{
    WithSetClassToAll (class_type)
    {
        for (const e of this.AsArray () )
        {
            e.Class = class_type;
        }
        return this;
    }
}


module.exports = FieldList;