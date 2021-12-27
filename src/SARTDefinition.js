// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTDefinition.js - 2021-12-07_01
//
// Base class for a definition-style classes.
//

const Util     = require ("./Util");
const SARTBase = require ("./SARTBase");


class SARTDefinition extends SARTBase
{
    
    Description       = null;
    
    constructor (name)
    {
        super ();
        this.WithName (name);        
    }

    WithDescription   (description)  { this.Description = description; return this; }        
    GetDescription    ()             { return this.Description; }
    
}

module.exports = SARTDefinition;