//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFSEntity.js - 2021-11-27_01
// ArFS-entity data (file, drive or folder)
// and the GQL-query to create them.
//

const Constants        = require ("./CONST_SART.js");
const Constants_ArFS   = require ("./CONST_ARFS.js");
const State            = require ("./ProgramState");
const Sys              = require ("./System.js");
const Util             = require ("./Util.js");
const Settings         = require ("./Settings.js");
const Arweave          = require ("./Arweave");
const SARTObject       = require ("./SARTObject");
const TXGroup          = require ("./TXGroup.js");
const TXQuery          = require ("./GQL/TXQuery");
const ContentQuery     = require ("./GQL/ArFSMultiEntityQuery");
const EntityGroup      = require ("./ArFSEntityGroup");
const TXTag            = require ("./TXTag");
const TXTagGroup       = require ("./TXTagGroup");
const Transaction      = require ("./Transaction");
const ArFSTX           = require ("./ArFSTX");



class MetaTXQuery extends TXQuery
{
   
    /* Override */ async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: Constants.GQL_SORT_OLDEST_FIRST} )
    {
        Sys.ERR ("ExecuteReqOwner not applicable to this query type.", this);
        return false;        
    }
   

    async Execute (arfs_id, entity_type)
    {       
        this.Sort = Constants.GQL_SORT_OLDEST_FIRST;
        
        const tags            = new TXTagGroup ();        
        tags.Add              ( new Constants_ArFS.TXTag_EntityType (entity_type),         );
        tags.Add              ( new Constants_ArFS.TXTag_ArFSID     (entity_type, arfs_id) );        
        tags.AddArweaveTXTags ( State.GetConfig ().ArFSTXQueryTags                         );
        

        await super.Execute
        (            
            {                                                           
                sort: this.Sort,
                tags: tags,                
            }
        );

    }

}




class ArFSEntity extends SARTObject
{
    // Primary
    Type                    = "ArFS-entity";
    ArFSID                  = null;
    EntityType              = null;        
    Owner                   = null;    
    Operations              = null;
    Encrypted               = null;
    Public                  = null;
    
    // Internal
    TX_All                  = new TXGroup ();
    TX_Entity               = new TXGroup ();     
    TX_Meta                 = new TXGroup ();
    TX_Data                 = null;    
    TX_First                = null;
    TX_Latest               = null;
    ParentEntity_Drive      = null;
    ParentEntity_Folder     = null;
    ParentEntity_RootFolder = null;
    ContainedEntities       = null;
    Query                   = null;


    RecursiveFields  = {"MetaTransactions": {}, "DataTransactions": {}, "History": { depth: 1 }, "AllTXStatus": {}, "Transactions": {}, 
                         "ContainedEntities": {depth: 1}, "Contains" : {},
                        "Versions": {}, "Content": {}, "Orphans": {}, "Parentless": {}, "Warnings": {}, "Errors": {} };
    InfoFields = 
    [ 
        "Type", 
        "EntityType", 
        "ArFSID", 
        "Name",
        "?DataContentType",
        "Created", 
        "Modified", 
        "Owner",
        "?FileID",
        "?FolderID",
        "?DriveID",
        "?DriveName",
        "?Cipher",
        "?Cipher-IV",
        "?DrivePrivacy",
        "?DriveAuthMode", 
        "?DriveStatus", 
        "?ParentFolderID", 
        "?ParentFolderName",
        "?RootFolderID",    
        "?FileDate",
        "?ReportedFileSize",
        "?ReportedFileSize_B",
        "?FileDate_UTMS",
        "?ParentStatus",
        "?Orphaned", 
        "?Encrypted",
        //"MetaTransactions",
        //"?DataTransactions",                 
        "MetaTXID_First",
        "MetaTXID_Latest",
        "?Transactions",
        "MetaTXStatus", 
        "MetaTXConfirmations",
        "?DataTXID", 
        "?DataTXStatus", 
        "?DataTXConfirmations",
        "?AllTXStatus", 
        "Operations", 
        "History", 
        "?Versions",
        "?Contains",
        //"?ContainedEntities",
        "?Content", 
        "Warnings", 
        "Errors"
    ];

    CustomFieldFuncs = 
    {
        "MetaTransactions"     : function (e) { return e.TX_Meta?.  AsArray           (); },
        "DataTransactions"     : function (e) { return e.TX_Data?.  AsArray           (); },
        "Created"              : function (e) { return e.TX_First?. GetDate           (); }, 
        "Modified"             : function (e) { return e.TX_Latest?.GetDate           (); }, 
        "MetaTXID_First"       : function (e) { return e.TX_First?. GetTXID           (); }, 
        "MetaTXID_Latest"      : function (e) { return e.TX_Latest?.GetTXID           (); }, 
        "Block_Created"        : function (e) { return e.TX_First?. GetBlockID        (); }, 
        "Block_Latest"         : function (e) { return e.TX_Latest?.GetBlockID        (); }, 
        "BlockHeight_Created"  : function (e) { return e.TX_First?. GetBlockHeight    ();_}, 
        "BlockHeight_Latest"   : function (e) { return e.TX_Latest?.GetBlockHeight    (); }, 
        "Operations"           : function (e) { return e.TX_Meta?.  GetAmount         (); }, 
        "DriveName"            : function (e) { return e.ParentEntity_Drive?.GetName  (); }, 
        "ParentFolderName"     : function (e) { return e.ParentEntity_Folder?.GetName (); }, 
        "Transactions"         : function (e) { return e.GenerateTransactionInfo      (); },
    };



    IsPublic          ()          { return this.Encrypted == false;                     }
    IsEncrypted       ()          { return this.Encrypted == true;                      }
    GetOwner          ()          { return this.Owner;                                  }
    GetPrivacy        ()          { return this.Privacy != null ? this.Privacy          
                                   : this.IsEncrypted () ? "private" : "public";        }
    GetName           ()          { return this.Name;                                   }
    GetArFSID         ()          { return this.ArFSID;                                 }
    HasArFSID         (id = null) { return id == null ? this.GetArFSID () != null 
                                                      : this.GetArFSID () == id;        }
    GetEntityType     ()          { return this.EntityType;                             }
    GetLastModified   ()          { return this.LastModified;                           }
    GetNewestMetaTXID ()          { return this.MetaTXID_Latest;                        }
    GetFirstMetaTXID  ()          { return this.MetaTXID_First;                         }
    GetStatus         ()          { return this.MetaTXStatus;                           }
    GetMetaStatusCode ()          { return this.MetaTXStatusCode;                       }
    GetDataStatusCode ()          { return this.DataTXStatusCode;                       }
    HasTransaction    (txid)      { return this.TX_All.HasTXID (txid);                  }
    IsDrive           ()          { return Constants_ArFS.IsDrive  (this.EntityType);   }
    IsFile            ()          { return Constants_ArFS.IsFile   (this.EntityType);   }
    IsFolder          ()          { return Constants_ArFS.IsFolder (this.EntityType);   }
    GetDriveID        ()          { return this.DriveID;                                }
    GetParentFolderID ()          { return this.ParentFolderID;                         }

    toString          ()      { return (this.ArFSID     != null ? this.ArFSID               : "[         ARFS-ID MISSING          ]" ) + " " +
                                       (this.Name       != null ? this.Name                 : "[NAME NOT FETCHED]"                   ) + " [" +
                                       (this.EntityType != null ? "ArFS-" + this.EntityType : "entity?"                              ) + "]"                               
                              }



    

    constructor (args = { entity_type: null, arfs_id: null} ) 
    {
        super ();
        this.__SetArFSID (args?.arfs_id);
        this.__SetEntityType (args?.entity_type);        
    }

    static GET_ENTITY (args = { entity_type: null, arfs_id: null} )
    {
        let entity = State.GetArFSEntity (args);

        if (entity == null)
        {
            entity = new ArFSEntity (args);
            State.AddArFSEntity     (entity);
        }

        return entity;
    }


    __AddTransaction (tx, is_entity_tx = true)
    {
        if (tx == null)
            return Sys.ERR_PROGRAM ("'tx' null.", "Entity.AddTransaction");
        
        else if (this.TX_All.HasTXID (tx.GetTXID () ) )
        {
            Sys.VERBOSE ("Transaction " + tx.GetTXID () + " already added in " + this + ".");
            return false;
        }

        else if (this.TX_All.Add (tx) && is_entity_tx)
        {
            this.TX_Entity.Add (tx);

            if (tx instanceof ArFSTX.ArFSMetaTX)
            { 
                this.TX_Meta.Add (tx); 
                Sys.VERBOSE ("MetaTX added: " + tx, this); 
            }
            else if (tx instanceof ArFSTX.ArFSDataTX)
            { 
                if (this.TX_Data == null)
                    this.TX_Data = new TXGroup ();

                this.TX_Data.Add (tx);
                Sys.VERBOSE ("DataTX added: " + tx, this); 
            }
            else
                return this.OnProgramError ("Transaction '" + tx?.toString () + " isn't a member of ArFS-TX-classes.", "ArFSEntity.__AddTransaction");

        }    
        return true;
    }



    __SetEntityType (entity_type)
    {
        this.EntityType = entity_type;

        if (entity_type != null && ! Constants_ArFS.IsValidEntityType (entity_type) )
        {
            const warning = "Entity-Type " + entity_type + " not recognized.";

            if (! Sys.WARN (warning, "ArFSEntity.__SetEntityType", { error_id: Constants.ERROR_IDS.ARFS_ENTITY_TYPE_UNKNOWN } ) )
                this.AddWarning (warning);
        }
    }

    __SetArFSID (arfs_id)
    {
        this.ArFSID = arfs_id;

        if (arfs_id != null && ! Util.IsArFSID (arfs_id) )
        {
            const warning = "ArFS-ID " + arfs_id + " doesn't seem to be a valid one.";

            if (! Sys.WARN (warning, "ArFSEntity.__SetArFSID", { error_id: Constants.ERROR_IDS.ARFS_ID_INVALID } ) )
                this.AddWarning (warning);

            this.SetInvalid ();
        }
    }

    __SetOwner (owner)
    {
        if (this.Owner == null)
        {
            this.Owner = owner;
            Sys.VERBOSE ("Owner of " + this + " set to '" + this.Owner + "'.");
        }
        else if (this.Owner != owner)
            this.OnProgramError ("Attempted to set owner to '" + owner + "' when it was already set to '" + this.Owner + "'. Will keep the existing owner.");
            
    }

    

    __SetFirstTX (tx)
    {
        if (tx == null)
            return false;

        const current_owner = this.GetOwner ();

        if (current_owner != null && current_owner != tx.GetOwner () )
            return this.OnError ("Tried to set first TX with a different owner (" + tx.GetOwner () + " than set to this entity (" + this.GetOwner () + ")"
                                 + " - POSSIBLE COLLISION ATTEMPT", this);

        const new_txid   = tx.GetTXID ();
        const same_block = tx.IsInSameBlockAs (this.TX_First);

        // Abort if the resolution concluded to keep the existing.
        if (same_block && !this.__ResolveSameBlock (this.TX_Latest, tx, false) )
            return false;

        if (this.TX_First == null || tx.IsOlderThan (this.TX_First) || same_block )
        {
            Sys.VERBOSE ("First transaction for " + this + " set to TXID: " + new_txid + " (was " + this.TX_First?.GetTXID ()  + ")");
            this.TX_First = tx;

            this.__SetOwner (tx.GetOwner () );
            
            if (!this.HasTransaction (tx) )
                this.__AddTransaction (tx, true);
        }
        else
            return this.OnError ("Attempted to set the first TX to be " + new_txid + " when an older " + this.TX_First.GetTXID () + " was already set.");
    }


    async __SetLatestTX (tx)
    {
        if (tx == null)
            return false;

        else if (tx.GetOwner () != this.GetOwner () )
            return this.OnError ("Tried to add TX with a different owner (" + tx.GetOwner () + " than set to this entity (" + this.GetOwner () + ")"
                                 + " - POSSIBLE COLLISION ATTEMPT");
        

        const new_txid      = tx             .GetTXID ();
        const existing_txid = this.TX_Latest?.GetTXID ();
        const same_block    = tx             .IsInSameBlockAs (this.TX_Latest);

        // Abort if the resolution concluded to keep the existing.
        if (same_block && !this.__ResolveSameBlock (this.TX_Latest, tx, true) )
            return false;

        if (this.TX_Latest == null || tx.IsNewerThan (this.TX_Latest) || same_block)
        {            
            Sys.VERBOSE ("Latest transaction for " + this + " set to TXID: " + new_txid + " (was " + existing_txid + ")");
            this.TX_Latest = tx;

            if (!this.HasTransaction (tx) )
                this.__AddTransaction (tx, true);


            // Update metadata
            if (tx instanceof ArFSTX.ArFSMetaTX)
            {
                await tx.FetchMetaOBJ ();                
                tx.SetFieldsToEntity ();
            }
            else
                this.OnProgramError ("Latest TX " + tx + " is not of class ArFSMetaTX - cannot extract data!", "ArFSEntity.__SetLatestTX");
    

            // Update/set containing entities
            if (this.ParentFolderID != null && (this.ParentEntity_Folder == null || !this.ParentEntity_Folder.HasArFSID (this.ParentFolderID))  )
                    this.ParentEntity_Folder = ArFSEntity.GET_ENTITY ( { entity_type: Constants_ArFS.ENTITYTYPE_FOLDER, arfs_id: this.ParentFolderID} )
            
            if (! this.IsDrive () && this.DriveID != null 
                && (this.ParentEntity_Drive == null || !this.ParentEntity_Drive.HasArFSID (this.DriveID))  )
                this.ParentEntity_Drive = ArFSEntity.GET_ENTITY ( { entity_type: Constants_ArFS.ENTITYTYPE_DRIVE, arfs_id: this.DriveID } )

        }        
        else
            return this.OnError ("Attempted to set the latest TX to be " + new_txid + " when a newer " + existing_txid + " was already set.");
    }


    // false = use old, true = use new.
    __ResolveSameBlock (old_tx, new_tx, seek_newest)
    {

        const existing_txid = old_tx?.GetTXID ();
        const new_txid      = new_tx?.GetTXID ();
        const bh_existing   = old_tx?.GetBlockHeight ();
        const bh_new        = new_tx?.GetBlockHeight ();

        if (bh_existing != bh_new)
        {
            this.OnProgramError ("Came to __ResolveSameBlock but the TXes " + existing_txid + " and " + new_tx
                                 + "were in blocks #" + bh_existing + " and #" + bh_new + " respectively. Now I'm confused. Returning false.");
            return false;
        }

        if (old_tx?.GetOwner () != new_tx?.GetOwner () )
        {
            this.OnProgramError ("OWNER CLASH AT __ResolveSameBlock (seek_newest:" + seek_newest + ") ! Should not have gotten this far! "
                                  + "Old TX owner:" + old_tx?.GetOwner () + " new TX-owner:" + new_tx?.GetOwner () + " "
                                  + "THE DATA OF THIS ENTITY IS NOT RELIABLE AND MAY CONTAIN MALICIOUS DATA!", this);
            return false;
        }

        const resolution = Constants_ArFS.ChooseNewestTXFromSameBlock (new_tx, old_tx, seek_newest);

        if (resolution.choice != null)
            this.OnWarning ("Multiple transactions as candidates for latest metadata (being in block #" + bh_new + ")"
                            + " - Chose " + resolution.choice + " over " + resolution.drop + " based on announced Unix-Times "
                            + "of the transaction. Note that this is NOT reliable as the Unix-Time -tag can be fabricated "
                            + "and used in race conditions. However, the owner of these transactions seems to be the same, "
                            + "so there should be no risk involved. Proceed with caution still. "
                            + "You can try to resolve the situation by moving or renaming the file.", this);

        else
        {
            this.OnError ("Multiple transactions as candicates for latest metadata (being in block #" + bh_new + ")"
                            + " - Could not figure which is never (existing " + existing_txid + " or new " + new_txid + "), "
                            + "sticking with the existing one. Both should have the same owner, so doesn't really matter. "
                            + "You can try to resolve the situation by moving or renaming the file.", this);
            return false;
        }
    
        if (resolution.choice == old_tx)
        {
            this.OnWarning ("Sticking to the existing TX_Latest: " + existing_txid + ", dropping " + new_txid, this);
            return false;
        }
        else if (resolution.choice == new_tx)
        {
            this.OnWarning ("Using the new TX: " + new_txid + ", dropping " + existing_txid, this);
            return true;
        }
        else            
        {
            Sys.ERR_FATAL ("PANIC: Something went horribly wrong while trying to decide ArFS-metadata order! Shutting down the system.");
            Sys.EXIT (-1);
        }

    }


    async Fetch ()
    {
        await this.FetchMetaTransactions ();
        await this.FetchMetaOBJs ();
    }


    async FetchAll ()
    {
        await this.Fetch ();
        await this.FetchRelatedEntities ();
        await this.FetchTXStatuses (); 
        //await this.FetchContentEntities (true);
        
        await this.GenerateHistory ();
        //this.GenerateContentInfo ();
        
    }


    // ***


    async FetchMetaTransactions ()
    {
        const arfs_id     = this.GetArFSID ();
        const entity_type = this.GetEntityType ();

        if (!this.IsValid () || !Util.IsArFSID (arfs_id) || !Util.IsSet (entity_type) )
        {
            this.OnProgramError ("Object not in a valid state: " + this, "ArFSEntity.FetchMetaTransactions");
            return false;
        }

        const query = new MetaTXQuery (Arweave);        
        await query.Execute (arfs_id, entity_type);        
        
        if (query.GetEdgesAmount () <= 0)
        {
            this.OnError ("Failed to fetch metadata-transactions for ArFS-ID:" + arfs_id + ", Entity-Type:" + entity_type);
            this.SetInvalid ();
            return false;
        }

        const txes_received = new TXGroup ();

        for (const e of query.GetEdges () )
        { 
            txes_received.Add (new ArFSTX.ArFSMetaTX (this).SetGQLEdge (e) );
        }

        

        // Seek for the first transaction for the ArFS-ID to establish ownership.
        // This call also sets Owner.
        this.__SetFirstTX (txes_received.GetOldestEntry () );
        

        // Verify that Owner is set.
        if (this.Owner == null)
        {
            this.SetInvalid ();
            return this.OnProgramError ("Owner was not set properly.", this);            
        }
            
        // Filter transactions matching the owner.
        this.TX_All  = new TXGroup ();
        this.TX_Meta = txes_received.GetTransactionsByOwner (this.Owner);
        this.TX_Meta.Sort (Constants.GQL_SORT_OLDEST_FIRST);
        this.TX_All.AddAll (this.TX_Meta);
        this.TX_Entity.AddAll (this.TX_All);
        
      

        if (this.TX_All == null || this.TX_All.GetAmount () <= 0 || this.TX_Meta == null || this.TX_Meta.GetAmount <= 0)
            return this.OnProgramError ("Failed to setup transaction arrays for " + this);
            


        // Get the newest TX
        await this.__SetLatestTX (this.TX_All.GetNewestEntry (this.Owner) );         
        
    }


    async FetchMetaOBJs ()
    {
        const amount = this.TX_Meta?.GetAmount ();
        
        if (amount > 0)
        {
            if (amount <= Settings.GetMaxConcurrentConn () )
            {
                Sys.VERBOSE ("Doing a concurrent-fetch of MetaOBJs (JSONs) for " + this + "...");
                
                const pool = [];
                for (const m of this.TX_Meta.AsArray () )
                {
                    if (m.FetchMetaOBJ != null)
                        pool.push (m.FetchMetaOBJ () );
                    else
                        this.OnProgramError ("Transaction encountered that lacks FetchMetaOBJ - TXID:" + m.GetTXID () , this);
                }

                for (const c of pool)
                {
                    await c;
                }
            }
            else
            {
                Sys.VERBOSE ("Doing a sequential fetch of MetaOBJs (JSONs) for " + this + "...");
                for (const m of this.TX_Meta.AsArray () )
                {
                    if (m.FetchMetaOBJ != null)
                        await m.FetchMetaOBJ ();
                    else
                        this.OnProgramError ("Transaction encountered that lacks FetchMetaOBJ - TXID:" + m.GetTXID () , this);
                }
            }
        }
    }

    async FetchTXStatuses ()
    {
        // Make sure we got all the indirect TXIDs (such as dataTxId)
        await this.FetchMetaOBJs ();

        // This needs to be called after meta obj fetch, can't be concurrent
        await this.TX_All.FetchStatusOfAll ();


    }


    async FetchRelatedEntities ()
    {
        await this.FetchMetaOBJs ();

        if (this.ParentEntity_Drive != null)
        {
            await this.ParentEntity_Drive.Fetch ();
            this.__AddTransaction (this.ParentEntity_Drive.TX_Latest, false);            
        }
        else
            this.OnProgramError ("FetchRelatedEntities: ParentEntity_Drive not set!", this);

        if (this.ParentEntity_Folder != null)
        {
            await this.ParentEntity_Folder.Fetch ();
            this.__AddTransaction (this.ParentEntity_Folder.TX_Latest, false);            
        }

        if (this.ParentEntity_RootFolder != null)
        {
            await this.ParentEntity_RootFolder.Fetch ();
            this.__AddTransaction (this.ParentEntity_RootFolder.TX_Latest, false);            
        }

    }


    async FetchContentEntities (fetch_content_metaobjs = false)
    {
        let arfs_id     = this.GetArFSID     ();
        let owner       = this.GetOwner      ();
        let entity_type = this.GetEntityType ();
        let drive_id    = this.GetDriveID    ();
        

        if (owner == null || entity_type == null || drive_id == null || arfs_id == null)
        {
            this.OnProgramError ("Important variables were null on FetchContent - calling Fetch () now.", this);
            await this.Fetch ();

            if ( (owner = this.GetOwner () ) == null)
                return this.OnProgramError ("Unable to get Owner.", this);
        
            if ( (entity_type = this.GetEntityType () ) == null)
                return this.OnProgramError ("Unable to get Entity-Type.", this);

            if ( (drive_id = this.GetDriveID () ) == null)
                return this.OnProgramError ("Unable to get DriveID.", this);

            if ( (arfs_id = this.GetArFSID () ) == null)
                return this.OnProgramError ("Unable to get ArFS-ID of this entity.", this);                                
        }

        const query = new ContentQuery (Arweave);
        
        switch (this.EntityType)
        {
            case Constants_ArFS.ENTITYTYPE_FOLDER:                
                await query.Execute (owner, Constants_ArFS.ENTITYTYPES_INFOLDER, drive_id, arfs_id);
                break;

            case Constants_ArFS.ENTITYTYPE_DRIVE:
                await query.Execute (owner, Constants_ArFS.ENTITYTYPES_INFOLDER, drive_id, null);
                break;

            case Constants_ArFS.ENTITYTYPE_FILE:
                Sys.DEBUG ("FetchContent: Files don't contain other files. Unless they're archives.", this);
                return false;                         

            default:
                this.OnWarning ("Don't know how to fetch content for Entity-Type '" + this.EntityType + "'.");
        }

        // Process entries.
        if (query.GetEdgesAmount () > 0)
        {
            const txgroup = await TXGroup.FROM_GQLQUERY (query);

            if (txgroup == null)
                return this.OnProgramError ("TXGroup.FROM_GQLQUERY returned no group!", this);

            // Just to make sure.            
            const filtered = txgroup.GetTransactionsByOwner (owner);
            filtered?.Sort (Constants.GQL_SORT_NEWEST_FIRST);

            if (filtered == null)
                return this.OnProgramError ("Something went wrong while filtering transactions.", this);

            else
            {
                if (this.ContainedEntities == null)
                    this.ContainedEntities = new EntityGroup;
                    
                const contained_entities = this.ContainedEntities;
                const id_of_this = this.GetArFSID ();

                for (const tx of filtered.AsArray () )
                {
                    const entity_type = tx.GetTagValue (Constants_ArFS.TAG_ENTITYTYPE);
                    const arfs_id     = tx.GetTagValue (Constants_ArFS.GetTagForEntityType (entity_type) );
                    const existing    = contained_entities.GetEntity ( {entity_type: entity_type, arfs_id: arfs_id} );

                    if (arfs_id == id_of_this)
                        continue;

                    if (entity_type == null)
                        this.OnError ("Encountered TX lacking Entity-Type - may not be an ArFS-TX: " + tx.GetTXID (), this);

                    else if (entity_type == Constants_ArFS.ENTITYTYPE_DRIVE )
                        this.OnProgramError ("Somehow got a drive (" + arfs_id + ") when querying for entity content? This should not happen.", this);

                    else if (existing == null)
                    {
                        Sys.WARN (entity_type);
                        
                        const new_entity = ArFSEntity.GET_ENTITY ( {entity_type: entity_type, arfs_id: arfs_id} );

                        if (fetch_content_metaobjs)
                            await new_entity.FetchMetaOBJs ();

                        contained_entities.AddEntity (new_entity);

                        Sys.VERBOSE ("Added entity " + new_entity + " into " + this + ".");
                    }
                    else
                        Sys.VERBOSE ("Entity " + existing + " already added into " + this + ", skipping metadata for now.");
                                            
                }


            }
            
                

        }        
    }
  

    /** Does not fetch anything. */
    GenerateTransactionInfo (tx_group = this.TX_Entity)
    {
        const transactions = {}
        

        for (const tx of tx_group?.AsArray () )
        {
            if (tx == null)
                this.OnProgramError ("null transaction found.", this);

            else
            {
                const txid = tx.GetTXID ();

                if (transactions[txid] != null)
                    this.OnProgramError ("Duplicate TXID found: " + txid);
                
                else
                {
                    const status = tx.GetStatus ()?.GetStatusFull ();
                    const date   = tx.GetDate ();

                    transactions[txid] = tx.GetTypeShort () + " "
                        + (date != null ? date : Util.GetDummyDate () ) + " - " 
                        + (status != null ? status : "PROGRAM ERROR: COULDN'T GET STATUS OBJECT" );
                }
            }
        }

        return transactions;
    }

    /** Does not fetch anything. */
    GenerateContentInfo ()
    {
        this.Content = [];

        if (this.ContainedEntities == null)
        {
            Sys.DEBUG ("GenerateContentInfo: No content fetched.", this);
            return false;
        }

        for (const entity of this.ContainedEntities.AsArray () )
        {
            if (entity == null)
                this.OnProgramError ("null entity found.", this);

            else
            {
                const arfs_id = entity.GetArFSID ();
                this.Content.push (entity);                
            }
        }
    }
    

    async GenerateHistory ()
    {
        let previous_entry = null, previous_key = null, previous_fields = [];
        
        this.History = [];

        const amount = this.TX_Meta?.GetAmount ();

        if (amount > 0)
        {
            let index = 0;
            let key, txid, fields, owner, changed, standing_owner;

            await this.FetchMetaOBJs ();
            this.TX_Meta.Sort (Constants.GQL_SORT_OLDEST_FIRST);

            for (const m of this.TX_Meta.AsArray () )
            {
                fields = m?.GetArFSFields != null ? m.GetArFSFields () : [];

                if (m != null)
                {
                    key   = index;
                    txid  = m.GetTXID ();                    
                    owner = m.GetOwner ();
                    changed = [];

                    this.History[key] = { Date: m.GetDate (), Actions: null, Event: null};
                    this.History[key].TXID = txid;                        
                    
                    
                    // Add changes as fields. Only do this if there are multiple metadata TXes.             
                    if (amount >= 2 && previous_fields != null && fields != null)
                    {                        
                        for (const f of Object.entries (fields) )
                        {
                            const field = f[0];
                            const val   = f[1];
             
                            if (previous_fields[field] != val)
                            {        
                                if (previous_entry != null)                        
                                    this.History[key].Modified = Util.AppendToArray (this.History[key].Modified, field);

                                this.History[key][field] = val;
                                changed.push (field);                            
                            }
                        }
                    }
                                 

                    // First entry
                    if (previous_entry == null)
                    {
                        standing_owner = owner;

                        if (this.TX_First == null)
                        {
                            Sys.ERR_PROGRAM ("First transaction of entity was not properly set for " + this + " - setting in CreateHistory ()");
                            this.__SetFirstTX (m);
                        }

                        else if (this.TX_First != m)
                        {
                            Sys.ERR_PROGRAM ("The meta-TXID set as first differs from what CreateHistory () found. Trying to re-set it.", this);
                            this.__SetFirstTX (m);
                        }

                        this.History[key].Event = "created";

                        let entity_type = this.GetEntityType ();

                        if (!Util.IsSet (entity_type) )
                            this.History[key].Actions = "Entity created with missing tag " + Constants_ArFS.TAG_ENTITYTYPE + ", or a program error occurred.";

                        else                    
                            entity_type = entity_type.charAt (0).toUpperCase () + entity_type.slice (1);

                        let alt_info = "";

                        if (fields.Name != null)
                            alt_info += " with name '" + fields.Name + "'";

                        this.History[key].Actions = entity_type + " created" + alt_info + ".";
                    }

                    // Subsequent entries
                    else
                    {
                        this.History[key].Event = "modified";

                        let main_info = "";

                        if (changed.includes ("Name") )
                            main_info = "Renamed to '" + fields["Name"] + "'";

                        if (changed.includes ("DataTXID") )
                            main_info += (main_info == "" ? "N" : ", n") + "ew data uploaded";

                        if (changed.includes ("ParentFolderID") )
                            main_info += (main_info == "" ? "M" : ", m") + "oved to another folder";

                        this.History[key].Actions = (main_info != "" ? main_info : "Metadata updated") + ".";

                        // Check for ardrive-web fucking up the file date upon move
                        if (previous_fields != null && changed.includes ("FileDate_UTMS") && !changed.includes ("DataTXID")
                        && Constants_ArFS.DidArDriveFuckUpTheFileDate (fields["FileDate_UTMS"], previous_fields["FileDate_UTMS"] )  )
                        {
                            this.History[key].Actions += " Seems that this operation fucked up the precise FileDate_UTMS..";
                            this.OnWarning ("Seems that the FileDate_UTMS (unixTime) got incorrectly rounded by an operation.");
                        }
                    }


                    // Check owner
                    if (previous_key == null || owner != standing_owner)
                    {
                        this.History[key].Owner = owner;

                        if (previous_key != null)
                            this.History[key].Actions += Sys.ANSIRED (" The TX is owned by different address! THIS MAY BE A BUG!");
                    }
                  


                    previous_key    = key;
                    previous_fields = fields;
                }
                else
                    this.OnProgramError ("Encountered a null transaction in 'TX-Meta' at index #" + index);
                
                previous_entry = m;
                ++index;
            }

            const last_tx = previous_entry;

            // Verify that last TX is set to last
            if (this.TX_Latest == null)
            {
                Sys.ERR_PROGRAM ("Latest transaction of entity was not properly set for " + this + " - setting in CreateHistory ()");
                this.__SetLatestTX (last_tx);
            }

            else if (this.TX_Latest != last_tx)
            {
                Sys.ERR_PROGRAM ("The meta-TXID set as latest differs from what CreateHistory () found. Trying to re-set it.", this);
                this.__SetLatestTX (last_tx);
            }


        }
        else
            this.OnProgramError ("Could not generate history - no metadata-transactions in 'TX_Meta'!", this);
    }


    

    async UpdateDetailed (arweave, verify = true, content = true)
    {
        if (this.TX_All == null || this.TX_All.GetAmount () <= 0)
        {
            this.OnProgramError ("Could not update detailed info - Transactions missing.")
            Sys.ERR_PROGRAM ("Transactions not set for " + this.toString () );
            this.AddError ("PROGRAM ERROR: Could not update detailed info - Transactions not set.");
            return;
        }
        
     
        // (Re)build history
        const history = [];
        const fileversions = {};
        
        let oldstate, newstate = {};
        let msg, str_changes;
        let newest_updated = false;

        for (const e of Object.values (this.TX_All.ByTXID) )
        {
            if (e == null)
            {
                Sys.ERR_PROGRAM ("'e' NULL", "Entity.UpdateDetailed", { once: true } );
                continue;
            }

            const txid = e.GetTXID ();
            const date = e.GetDate ();

            const meta    = await this.__FetchMeta    (arweave, txid);
            const txentry = await this.__FetchTXEntry (arweave, txid);
            const datestr = (date != null ? date : Util.GetDummyDate () );

            msg = datestr + " - ";
            
            oldstate = newstate;
            newstate = await this.__GetState (arweave, meta, txentry, verify);

            // File versions
            if (newstate.DataTXID != null && fileversions[newstate.DataTXID] == null)
            {
                let filever_str = msg;

                filever_str = Util.AppendIfNotNull (filever_str, "'" + newstate.Name          + "'", ", ");
                filever_str = Util.AppendIfNotNull (filever_str,       newstate.Size          + 'B', ", ");
                filever_str = Util.AppendIfNotNull (filever_str,       newstate.DataTXStatus,        ", ");

                fileversions[newstate.DataTXID] = filever_str;            
            }

            // Update newest state
            if (txid == this?.MetaTXID_Latest)
            {
                this.__UpdateStateToNewest (newstate);
                newest_updated = true;
            }
        
            
            // Compare to old
            str_changes = null;
            for (const m of Object.entries (newstate) )
            {                
                if (m[1] != oldstate[m[0]] )
                    str_changes = Util.Append (str_changes, m[0] + ":" + m[1], ", " );
            }

            // First metadata
            if (txid == this?.MetaTXID_First)
                msg += "Created" + (str_changes != null ? " with " + str_changes + "." : ".");
                                                        

            // Subsequent metadata (renames, moves etc.)
            else            
                msg += "Modified" + (str_changes != null ? ": " + str_changes + "." : ".");                                            
            
            if (Settings.IsDebug () && meta != null)
            {
                try { msg += " JSON:" + JSON.stringify (meta); } catch (e) { Sys.ON_EXCEPTION (e, "Entity.UpdateHistory"); }                            
            }
            
            history[txid] = msg;
                        
        }

        // A failsafe to ensure that the info contains some data
        if (!newest_updated)
        {
            Sys.ERR_ONCE ("Entity.UpdateHistory: Newest data was for some reason not updated. Updating manually.");
            this.UpdateBasic (arweave, true, true, true);
        }

        this.History = history;

  
        if (Object.keys (fileversions)?.length >= 1)
            this.Versions = fileversions;


        
        switch (this.EntityType)
        {
            case Constants_ArFS.ENTITYTYPE_DRIVE:

                const id    = this != null ? this['ArFS-ID'] : null;
                const owner = this?.Owner;
        
                if (content)
                {
                    if (id != null && owner != null)
                    {
                        Sys ("Retrieving drive content. This may take a while.");
                        const query = new ArFSDriveContentQuery (arweave);
                        const results = await query.Execute (id, owner);

                        if (results != null)
                            this.Content = results;
                    }
                    else
                        Sys.ERR ("Could not retrieve drive content, either of these is null: " + id + " or " + owner);
                }
            
                break;
            
            case Constants_ArFS.ENTITYTYPE_FOLDER:
                // Passthrough intentional.

            case Constants_ArFS.ENTITYTYPE_FILE:

                // Verify that the drive metadata exists
                if (this?.DriveID != null)
                {
                    const query = new ArFSEntityQuery (arweave);
                    const de = await query.Execute (this.DriveID, Constants_ArFS.ENTITYTYPE_DRIVE);

                    if (de == null)
                    {                                                
                        this.Orphaned        = true;
                        this.Errors          = Util.AppendToArray (this.Errors, "Metadata for the drive (" + this.DriveID + ") missing!");
                        this.DriveStatus     = " !!! DRIVE METADATA MISSING !!!";  
                        this.DriveStatusCode = 404;
                    }
                    else                
                    {
                        await de.UpdateBasic (arweave);
                        this.DriveStatus     = de.GetStatus ();
                        this.DriveStatusCode = de.GetMetaStatusCode ();
                    }
                }
                
                // Verify that the parent folder exists, ie. that the entry isn't orphaned.
                if (this?.ParentFolderID != null)
                {
                    const query = new ArFSEntityQuery (arweave);
                    const pfe = await query.Execute (this.ParentFolderID, Constants_ArFS.ENTITYTYPE_FOLDER);
                    
                    if (pfe == null)
                    {                        
                        this.Orphaned         = true;
                        this.Errors           = Util.AppendToArray (this.Errors, "Parent folder " + this.ParentFolderID + " does not exist.");
                        this.ParentStatus     = "!!! FOLDER DOES NOT EXIST !!!";
                        this.ParentStatusCode = 404;
                    }
                    else
                    {
                        await pfe.UpdateBasic (arweave);
                        this.ParentStatus     = pfe.GetStatus ();
                        this.ParentStatusCode = pfe.GetMetaStatusCode ();                        
                    }
                }
                break;
                
            default:
                break;
        }            
        
    }




  


  

 




    GetStatusInfo ()
    {
        const status_info = { };

        // Copy the selected fields from the info-output
        for (const sf of this.StatusFields)
        {
            const split = sf.split ("=");
            
            let val;
            if (split?.length <= 1)
            {
                if ( (val = this[sf]) != null)
                    status_info[sf] = val;
            }
            else if ( (val = this[split[1]]) )
                status_info[split[0]] = val;
        }

        status_info.Errors = [];

        // Copy main errors
        if (this?.Errors != null)                
            Util.CopyKeysToObj (this.Errors, status_info.Errors);

        // Copy content errors
        if (this?.Content?.Errors != null)                
            Util.CopyKeysToObj (this.Content.Errors, status_info.Errors);
        

        if (this.MetaTXStatusCode != null && this.MetaTXStatusCode == 404)
            status_info.Errors = Util.AppendToArray (status_info.Errors, "Metadata TX not found.");

        if (this.DataTXStatusCode != null && this.DataTXStatusCode == 404)
            status_info.Errors = Util.AppendToArray (status_info.Errors, "Data TX doesn't seem to exist.");            




        // Categorize TX-state
        const safe_confirmations = State.Config.SafeConfirmationsMin;

        const confirmed = (this.MetaTXStatusCode == 200 && this.MetaTXConfirmations >= safe_confirmations) &&
                        (this.DataTXStatusCode == null || (this.DataTXStatusCode == 202 && this.DataTXConfirmations >= safe_confirmations) );

        const mined   = (this.MetaTXStatusCode == 200 && this.MetaTXConfirmations < safe_confirmations) &&
                        (this.DataTXStatusCode == null || (this.DataTXStatusCode == 202 && this.DataTXConfirmations < safe_confirmations) );                        

        const pending = (this.MetaTXStatusCode != null && this.MetaTXStatusCode == 202) ||
                        (this.DataTXStatusCode != null && this.DataTXStatusCode == 202);

        const failed  = (this.MetaTXStatusCode == null || this.MetaTXStatusCode == 404) ||
                        (this.DataTXStatusCode != null && this.DataTXStatusCode == 404);                        

        if (failed)
            status_info.Errors = Util.AppendToArray (status_info.Errors, "The " + this.EntityType + " failed to be properly mined to Arweave.");
    
        if (this?.Content?.OrphanedEntities >= 1)
            status_info.Errors = Util.AppendToArray (status_info.Errors, 
                (this.Content.OrphanedEntities == 1 ? "One orphaned entity found." : this.Content.OrphanedEntities + " orphaned entities found.") );



        // Report
        status_info.Status = "???";
        status_info.Analysis = "The " + this.EntityType;



        if (status_info.Errors?.length >= 1)
        {
            status_info.Status = "FAULTY";            

            status_info.Analysis += " has some errors."

            if (this.MetaTXStatusCode == null)
                status_info.Analysis += " It seems that the status for the metadata could not be retrieved. This shouldn't be the case, "
                                     +  "indicating a possible program error. Run the thing with --verbose or --debug for any clues of "
                                     +  "why this might be happening - feel free to poke me about it. Contact details at 'INFO Silanael'.";

            else if (this.MetaTXStatusCode == 404)
                status_info.Analysis += " The metadata-TX is for some reason not found. This is rather strange. "
                                     +  "You could try running the thing with --verbose or --debug for any clues of "
                                     +  "why this might be happening, or poke me about it. Contact details at 'INFO Silanael'.";

            if (this.DataTXID != null && this.DataTXStatusCode != null)
                status_info.Analysis += " The status of the Data TX could not be retrieved for some reason. "
                                     +  "You could try running the thing with --verbose or --debug for any clues of "
                                     +  "why this might be happening, or poke me about it. Contact details at 'INFO Silanael'.";

            if (this.DataTXID != null && this.DataTXStatusCode != null && this.DataTXStatusCode == 404)
                status_info.Analysis += " The data TX seems to be missing. This is the actual file data of the file."
                                     + " This may happen during times of high network congestion when uploading without "
                                     + " using a bundler. Re-uploading the file should solve the issue, though do "
                                     + " manually confirm that the transaction " + this.DataTXID + " doesn't exist. "
                                     + " A block explorer such as "
                                     + "https://viewblock.io/arweave/tx/" + this.DataTXID + " can be used,"
                                     + " or SART's command: 'INFO TX " + this.DataTXID + "'."

            if (this.Orphaned)
            {
                status_info.Analysis += " It seems to be orphaned, "

                if (this.ParentStatusCode == 404)
                {
                    if (this.DriveStatusCode == 404)
                        status_info.Analysis += "Both the containing drive (" + this.DriveID + ") and "

                    status_info.Analysis += "parent folder (" + this.ParentFolderID + ") appearing to not exist. Verify this yourself.";
                }
                else if (this.DriveStatusCode == 404)
                    status_info.Analysis += "the containing drive (" + this.DriveID + ") appearing to not exist. Verify this yourself."

                else
                    status_info.Analysis += " somehow. Can't determine how exactly, seems to be a program error. Give me a poke about it. "

                status_info.Analysis += " The issue can be remedied by creating the missing ArFS-entities. SART can't do this yet"
                                     +  " but it should be able to in the near future. For public drives, these entities can be created"
                                     +  " by hand with a tool such as Arweave-Deploy. "
            }

            if (this.Content?.OrphanedEntities > 0)
                status_info.Analysis += " This thing seems to contain some orphaned files/folders, ie. ones that"
                                     +  " are contained in a folder that doesn't exist. These folders are missing: "
                                     + this.Content?.MissingFolders?.toString () + " - the issue can be solved by creating"
                                     + " metadata-entries for these folders. SART cannot yet do this, but it's on the TODO-list."

            status_info.Analysis += " Other than this, it"
        }

        else
            status_info.Status = pending ? "PENDING" : mined ? "LOW CONFIRMATIONS" : confirmed ? "OK" : "???";


        if (pending)
            status_info.Analysis += " has not yet been mined to Arweave. It may succeed or fail. Check again later.";
        
        else if (mined)
            status_info.Analysis += " has been mined, but the amount of confirmations is low. A small chance exists "
                                    +  " that a fork causes it to be dropped from the chain. Wait until status is CONFIRMED.";
        else 
            status_info.Analysis += " seems to be all good, mined into Arweave with an amount of confirmations deemed sufficient "
                                    + "(>= " + safe_confirmations + " from Config).";
    

        if (this.EntityType == Constants_ArFS.ENTITYTYPE_DRIVE)
            status_info.Analysis += " File integrity NOT ANALYZED - use the VERIFY-command for that.";

        else if (this.EntityType == Constants_ArFS.ENTITYTYPE_FOLDER)
            status_info.Analysis += " File integrity of the files in the folder NOT ANALYZED - use the VERIFY-command to check the entire drive.";            

     
        return status_info;
    }



}








module.exports = ArFSEntity;

