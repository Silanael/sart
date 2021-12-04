//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFSMultiEntityQuery.js - 2021-12-03_01
// 
// Query for ArFS-metadata transactions contained in drive and/or folder.
//

const Constants  = require ("../CONST_ARFS");
const Const_ArFS = require ("../CONST_ARFS");
const State      = require ("../ProgramState");
const TXQuery    = require ("./TXQuery");
const TXTagGroup = require ("../TXTagGroup");
const Util       = require ("../Util");




class ArFSMultiEntityQuery extends TXQuery
{
   
    /* Override */ async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: Constants.GQL_SORT_OLDEST_FIRST} )
    {
        Sys.ERR ("ExecuteReqOwner not applicable to this query type.", this);
        return false;        
    }
   

    async Execute (owner, entity_types, drive_id, parent_folder_id = null)
    {       
        if (owner == null)
            return this.OnError ("'owner' null", this);

        if (entity_types == null)
            return this.OnError ("'entity_types' null. Should be an array.", this);

        if (drive_id == null)
            return this.OnError ("'drive_id' null. Should be an array.", this);            
        
        
        this.Sort = Constants.GQL_SORT_OLDEST_FIRST;
        
        const tags            = new TXTagGroup ();        
        tags.Add              ( new Const_ArFS.TXTag_EntityType     (entity_types)      );
        tags.Add              ( new Const_ArFS.TXTag_DriveID        (drive_id)          );
        if (parent_folder_id != null)
            tags.Add          ( new Const_ArFS.TXTag_ParentFolderID (parent_folder_id)  );

        tags.AddArweaveTXTags ( State.GetConfig ().ArFSTXQueryTags                      );
        

        await super.Execute
        (            
            {                                                           
                sort:  this.Sort,
                owner: owner,
                tags:  tags,                
            }
        );

    }

}


module.exports = ArFSMultiEntityQuery;