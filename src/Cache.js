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
const Sys     = require ("./System");
const State   = require ("./ProgramState");


class Cache 
{
    State;
    
    CacheHits                 = 0;
    CacheMisses               = 0;

    Transactions              = new TXGroup ();
    ArFSEntities_ByArFSID     = {};
    ArFSEntities_ByEntityType = {};



    static CREATE ()
    {
        State.Cache       = new Cache ();
        State.CacheHits   = 0;
        State.CacheMisses = 0;
    }

    Clean ()
    {
        this.Transactions = new TXGroup ();
        this.ArFSEntities_ByArFSID = this.ArFSEntities_ByArFSID ();
    }


    AddArFSEntity (entity)
    {
        const __tag = "Cache.AddArFSEntity";

        if (entity == null)
            return Sys.ERR_PROGRAM ("'entity' null", __tag);

        else
        {
            const entity_type = entity.GetEntityType ();
            const arfs_id     = entity.GetArFSID     ();
            let entity_list = null;

            if (arfs_id == null)
                return Sys.ERR ("ArFSID null in " + entity + ".", __tag)

            

            if (entity_type == null)
                Sys.WARN ("Entity-Type null in " + entity + ".", __tag)

            else
            {
                entity_list = this.ArFSEntities_ByEntityType[entity_type];

                if (entity_type == null)
                {
                    entity_list = {};
                    this.ArFSEntities_ByEntityType[entity_type] = entity_list;
                }                             
            }
            
            if (this.ArFSEntities_ByArFSID[arfs_id] != null || (entity_list != null && entity_list[arfs_id] != null) )
                return Sys.ERR_PROGRAM ("Attempted to add an entity (" + entity + ") to the cache with ArFS-ID that's already added: " + arfs_id);

            else
            {
                this.ArFSEntities_ByArFSID[arfs_id] = entity;

                if (entity_list != null)
                    entity_list[arfs_id] = entity;

                return true;
            }

            
        }
    }

    GetArFSEntity (args = { entity_type: null, arfs_id: null } )
    {
        let entity;

        if (args == null)
            return Sys.ERR_PROGRAM ("Args not provided.", "Cache.GetArFSEntity");

        else if (args.entity_type != null)
        {
            const typelist = this.ArFSEntities_ByEntityType [args.entity_type];
            entity = typelist != null ? typelist [args.entity_type] : null;        
        }
        else
            entity =  this.ArFSEntities_ByArFSID [args.arfs_id];

        if (entity != null)
            ++this.CacheHits;

        else
            ++this.CacheMisses;

        return entity;
    }
}



module.exports = Cache;