// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// FetchDef.js - 2022-01-16_01
//
// Fetch definition
//

const SARTBase = require ("./SARTBase");


class FetchDef extends SARTBase
{    
    FetchFunc = null;

    constructor (name, fetchfunc)
    {
        super (name);
        this.FetchFunc = fetchfunc;
    }
    
}


module.exports = FetchDef;