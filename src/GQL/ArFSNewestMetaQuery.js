//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFSNewestMetaQuery.js - 2021-12-06_01
// 
// Query for the newest metadata of ArFS-entity/entities.
//

const Constants  = require ("../CONST_SART");
const Const_ArFS = require ("../CONST_ARFS");
const State      = require ("../ProgramState");
const TXQuery    = require ("./TXQuery");
const TXTagGroup = require ("../TXTagGroup");
const Util       = require ("../Util");




class ArFSNewestMetaQuery extends TXQuery
{
   
    /* Override */ async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: Constants.GQL_SORT_OLDEST_FIRST} )
    {
        Sys.ERR ("ExecuteReqOwner not applicable to this query type.", this);
        return false;        
    }
   

    async Execute (owner, arfs_id, entity_type)
    {       
        this.SetSort (Constants.GQL_SORT_NEWEST_FIRST);
    
        if (owner == null)
            return this.OnProgramError ("'owner' null", this);

        if (entity_type == null)
            return this.OnProgramError ("'entity-type' null", this);

        if (arfs_id == null)
            return this.OnProgramError ("'arfs_id' null.", this);


        const tags            = new TXTagGroup ();        
        tags.Add              ( new Const_ArFS.TXTag_EntityType     (entity_type) );
        tags.Add              ( new Const_ArFS.TXTag_ArFSID         (entity_type, arfs_id))                
        tags.AddArweaveTXTags ( State.GetConfig ().ArFSTXQueryTags );
        

        await super.Execute
        (            
            {                                                           
                sort:  Constants.GQL_SORT_NEWEST_FIRST,
                first: 1,
                owner: owner,
                tags:  tags,
            }
        );

    }

}


module.exports = ArFSNewestMetaQuery;