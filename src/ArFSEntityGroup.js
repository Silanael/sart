//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFSEntityGroup.js - 2021-12-03_01
// 
// A collection of ArFS-entities, ie. a content of a folder
// or an entire drive.
//

const Sys = require ("./System");


class ArFSEntityGroup
{
    Entities     = [];
    ByArFSID     = {};
    ByEntityType = {};


    AsArray  () { return this.Entities; }
    toString () { const amount = Object.keys (this.ByArFSID)?.length; return "ArFSEntityGroup with " 
                  + (len == 0 ? "no entities" : len == 1 ? "one entity." : len + " entities") + "." }
                  

    AddEntity (entity)
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
                entity_list = this.ByEntityType[entity_type];

                if (entity_list == null)
                {
                    entity_list = {};
                    this.ByEntityType[entity_type] = entity_list;
                }                             
            }
            
            if (this.ByArFSID[arfs_id] != null || (entity_list != null && entity_list[arfs_id] != null) )
                return Sys.ERR_PROGRAM ("Attempted to add an entity (" + entity + ") to the cache with ArFS-ID that's already added: " + arfs_id);

            else
            {
                this.Entities.push (entity);
                this.ByArFSID[arfs_id] = entity;

                if (entity_list != null)
                    entity_list[arfs_id] = entity;

                return true;
            }

            
        }
    }

    GetEntity (args = { entity_type: null, arfs_id: null } )
    {
        let entity;

        if (args == null)
            return Sys.ERR_PROGRAM ("Args not provided.", "Cache.GetArFSEntity");

        else if (args.entity_type != null)
        {
            const typelist = this.ByEntityType [args.entity_type];
            entity = typelist != null ? typelist [args.arfs_id] : null;        
        }
        else
            entity = this.ByArFSID [args.arfs_id];

        return entity;
    }
}

 module.exports = ArFSEntityGroup;