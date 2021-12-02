//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Cache.js - 2021-11-30_01
// 
// Runtime- and on-disk cache.
//

const TXGroup = require ("./TXGroup");

class Cache 
{
    Transactions          = new TXGroup ();
    ArFSEntities_ByArFSID = {};

    Clean ()
    {
        this.Transactions = new TXGroup ();
        this.ArFSEntities_ByArFSID = this.ArFSEntities_ByArFSID ();
    }
}



module.exports = Cache;