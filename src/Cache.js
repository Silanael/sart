//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Cache.js - 2021-11-30_01
// 
// Runtime- and on-disk cache.
//

const TXGroup         = require ("./Arweave/TXGroup");
const ArFSEntityGroup = require ("./ArFS/ArFSEntityGroup");
const Sys             = require ("./System");
const State           = require ("./ProgramState");


class Cache 
{
    State;
    
    Transactions              = new TXGroup ();
    ArFSEntities              = new ArFSEntityGroup ();
 
    static CREATE ()
    {
        State.Cache = new Cache ();
        State.CacheHits   = 0;
        State.CacheMisses = 0;
    }


    Clear ()
    {
        this.Transactions = new TXGroup ();
        this.ArFSEntities = new ArFSEntityGroup ();
        State.CacheHits   = 0;
        State.CacheMisses = 0;
    }


    AddArFSEntity (entity) { return this.ArFSEntities.AddEntity (entity); }
    GetArFSEntity (args = { entity_type: null, arfs_id: null } )
    {
        const entity = this.ArFSEntities.GetEntity (args);
        
        if (entity != null)
            ++this.State.CacheHits;

        else
            ++this.State.CacheMisses;

        return entity;
    }

}



module.exports = Cache;