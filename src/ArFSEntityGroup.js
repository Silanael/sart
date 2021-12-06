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

const Sys        = require ("./System");
const SARTObject = require ("./SARTObject");


class ArFSEntityGroup extends SARTObject
{
    Entities     = [];
    ByArFSID     = {};
    ByEntityType = {};

    Files        = [];
    Folders      = [];


    AsArray  () { return this.Entities; }
    toString () { const amount = Object.keys (this.ByArFSID)?.length; return "ArFSEntityGroup with " 
                  + (len == 0 ? "no entities" : len == 1 ? "one entity." : len + " entities") + "." }
                  
    GetAmount        () { return this.Entities.length; }
    GetFilesAmount   () { return this.Files.length;    }
    GetFoldersAmount () { return this.Folders.length;  }
    FilesAsArray     () { return this.Files;           }
    FoldersAsArray   () { return this.Folders;         }


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

                if      (entity.IsFile   () ) this.Files  .push (entity);
                else if (entity.IsFolder () ) this.Folders.push (entity);


                return true;
            }            
        }
    }


    AddAll (entity_group)
    {
        if (entity_group == null)
            return this.OnProgramError ("AddAll: 'entity_group' null.", this);

        else if (entity_group.GetAmount () > 0)
        {
            for (const e of entity_group.AsArray () )
            {
                this.AddEntity (e);
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


    async FetchNewestMetadataTXForAll () { await this.ExecOnAllEntitiesAndAwait ("FetchNewestMetaTransaction"); }
    
    async FetchNewestMetaOBJForAll ()
    { 
        const pool = [];
        for (const e of this.AsArray () )
        {
            if (e != null)
                pool.push (e.FetchLatestMetaObj () );
        }
        if (pool.length > 0)
            await Promise.all (pool);        
    }


    async ExecOnAllEntitiesAndAwait (func_name, params = null)
    {
        const pool = [];

        for (const e of this.AsArray () )
        {
            if (e != null)
                pool.push (e[func_name] (params) );
        }

        if (pool.length > 0)
        {
            Sys.DEBUG ("ArFSEntityGroup: Awaiting for " + pool.length + " executions of function '" + func_name + "' (params: " + params + ")...");

            await Promise.all (pool);            

            Sys.DEBUG ("ArFSEntityGroup: Awaiting for " + pool.length + " executions of function '" + func_name + "' (params: " + params + ") done.");            
        }
    }

    GetMatchingByFieldVal (field, val)
    {
        const group = new ArFSEntityGroup ();

        for (const e of this.AsArray () )
        {
            if (e[field] == val)
                group.AddEntity (e);
            else
                Sys.VERBOSE ("Dropped " + e + " as it was not matching the criteria of field:" + field + " value:" + val 
                              + " - had " + (e[field] != null ? e[field] : "no value") + ".");
        }

        return group;
    }
}

 module.exports = ArFSEntityGroup;