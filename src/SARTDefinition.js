// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTDefinition.js - 2021-12-07_01
//
// Base class for a definition-style classes.
//

const Util = require ("./Util");


class SARTDefinition
{

    Name              = null;
    Description       = null;
    NameCaseSensitive = false;

    constructor (name)
    {
        this.Name = name;
    }

    WithDescription   (description)  { this.Description = description; return this; }
    WithCaseSensitive ()             { this.NameCaseSensitive = true;  return this; }

    GetName           ()             { return this.Name; }
    GetDescription    ()             { return this.Description; }
    
    HasName           (name, case_sensitive = this.NameCaseSensitive) { return Util.StrCmp (name, this.GetName(), !case_sensitive); }

}

module.exports = SARTDefinition;