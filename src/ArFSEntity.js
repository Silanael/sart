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
const Sys              = require ("./System.js");
const Util             = require ("./Util.js");
const Settings         = require ("./Settings.js");





class ArFSEntity
{
    Info =
    {
        ArFSID:              null,
        EntityType:          null,        
        Owner:               null,
        TXID_Created:        null,
        TXID_Latest:         null,
        Block_Created:       null,
        Block_Latest:        null,
        BlockHeight_Created: null,
        BlockHeight_Latest:  null,
        Operations:          null,
        IsEncrypted:         null,
        IsPublic:            null,
        Errors:              null,
        Warnings:            null,
    }

    Transactions    = null;        
    FirstTX         = null;
    LatestTX        = null;
    LatestMeta      = null;
    MetaByTXID      = {};
    Query           = null;

    RecursiveFields = ["History", "Versions", "Content", "Orphans", "Parentless", "Errors"];
    StatusFields    = ["Entity-Type", "ArFS-ID", "Name", "Created", "LastModified", "Owner", "DriveID", "DriveStatus", "ParentFolderID", "ParentStatus",
                       "IsOrphaned", "IsEncrypted", "MetaTXID=TXID_Latest", "MetaTXStatus", "MetaTXConfirmations",
                       "DataTXID", "DataTXStatus", "DataTXConfirmations", "Operations", "History", "Versions", "Content"];


    constructor (args = { entity_type: null, arfs_id: null} ) 
    {
        this.__SetArFSID (args?.arfs_id);
        this.__SetEntityType (args?.entity_type);        
    }

    toString    () { return (this.Info.EntityType != null ? "ArFS-" + this.Info.EntityType : "ArFS-entity (type missing)" 
                    + " " + (this.ArFSID != null ? this.ArFSID : "(ArFS-ID missing)") 
                    + " Latest TXID: " + (this.LatestTX != null ? this.LatestTX.GetTXID ()  : "NOT SET") 
                    )  }
    GetErrorStr () { return this.Info.Errors != null || this.Info.Errors.length > 0 ? this.Info.Errors.toString () : "No errors."; }


    __SetEntityType (entity_type)
    {
        this.Info.EntityType = entity_type;

        if (entity_type != null && ! Constants_ArFS.IsValidEntityType (entity_type) )
        {
            const warning = "Entity-Type " + entity_type + " not recognized.";
            if (! Sys.WARN (warning, "ArFSEntity.__SetEntityType", { error_id: Constants.ERROR_IDS.ARFS_ENTITY_TYPE_UNKNOWN } ) )
                this.AddWarning (warning);
        }
    }

    __SetArFSID (arfs_id)
    {
        this.Info.ArFSID = arfs_id;

        if (arfs_id != null && ! Util.IsArFSID (arfs_id) )
        {
            const warning = "ArFS-ID " + arfs_id + " doesn't seem to be a valid one.";
            if (! Sys.WARN (warning, "ArFSEntity.__SetArFSID", { error_id: Constants.ERROR_IDS.ARFS_ID_INVALID } ) )
                this.AddWarning (warning);
        }
    }

    AddTransaction (tx)
    {
        if (tx == null)
            return Sys.ERR_PROGRAM ("'tx' null.", "Entity.AddTransaction");
        
        if (this.Transactions == null)
            this.Transactions = new TXGroup ();

        else if (this.Transactions.HasTXID (tx.GetTXID () ) )
        {
            Sys.VERBOSE ("Already has transaction " + tx.GetTXID () )
            return false;
        }

        return this.Transactions.AddTransaction (tx);        
    }


    static FromTXQuery (txquery, args = {entity_type: null, arfs_id: null} )
    {
        if (txquery == null || txquery.GetEdgesAmount () <= 0)
            return null;

        const entity = new ArFSEntity (args);
        entity.Query = this;

        const all_transactions = txquery.GetTransactions          ();

        const first_tx         = all_transactions.GetOldestEntry  ();
        const owner            = first_tx.GetOwner                ();
        const latest_tx        = all_transactions.GetNewestEntry  (owner);

        if (owner == null)
        {
            const error = "Could not get owner for the ArFS-entity!";
            this.AddError ("PROGRAM ERROR: " + error);
            Sys.ERR_PROGRAM (error, "ArFSEntity.FromTXQuery");
            Sys.DEBUG (txquery);

            return null;
        }

        entity.Transactions = all_transactions.GetTransactionsByOwner (owner);


        if (first_tx != null)
        {
            // Fetch entity-type from the first TX if not given as parameter.
            if (args.entity_type == null)
                args.entity_type = first_tx.GetTagValue (Constants_ArFS.TAG_ENTITYTYPE);
                            
            // Same for ID
            if (args.arfs_id == null)
                args.arfs_id = first_tx.GetTagValue (Constants_ArFS.GetTagForEntityType (args.entity_type) );


            if (entity.FirstTX == null || entity.FirstTX.IsNewerThan (first_tx) )
            {
                Sys.DEBUG ("First TX set to TXID:" + first_tx?.GetTXID () + " - was " 
                    + (entity.FirstTX != null ? entity.FirstTX.GetTXID () : "not set yet.") );

                entity.FirstTX  = first_tx;
            }

            if (entity.LatestTX == null || latest_tx.IsNewerThan (entity.LatestTX) )
            {
                Sys.DEBUG ("Latest TX set to TXID:" + latest_tx?.GetTXID () + " - was " 
                    + (entity.LatestTX != null ? entity.LatestTX.GetTXID () : "not set yet.") );

                entity.LatestTX = latest_tx;                
            }
            
            entity.__SetEntityType (args.entity_type);
            entity.__SetArFSID     (args.arfs_id);
                        
            entity.Info.Owner                = owner;
            entity.Info.Created              = first_tx ?.GetBlockTime () != null ? Util.GetDate (first_tx. GetBlockTime () ) : null;
            entity.Info.LastModified         = latest_tx?.GetBlockTime () != null ? Util.GetDate (latest_tx.GetBlockTime () ) : null;
            entity.Info.TXID_Created         = first_tx ?.GetTXID        ();
            entity.Info.TXID_Latest          = latest_tx?.GetTXID        ();
            entity.Info.Block_Created        = first_tx ?.GetBlockID     ();
            entity.Info.Block_Latest         = latest_tx?.GetBlockID     ();
            entity.Info.BlockHeight_Created  = first_tx ?.GetBlockHeight ();
            entity.Info.BlockHeight_Latest   = latest_tx?.GetBlockHeight ();
            entity.Info.Operations           = entity.Transactions?.GetAmount ();
            entity.Info.IsEncrypted          = first_tx?.HasTag (Constants_ArFS.TAG_CIPHER);
         

            if (entity.Operations <= 0)
            {
                Sys.ERR ("Something went wrong - couldn't get entries for ArFS-ID " + Entity.Info["ArFS-ID"] + " matching owner " + owner);
                this.AddError ("PROGRAM ERROR: Transactions not set or not populated.");
            }

 
            // Don't update the metadata yet.
            // This query can be used to retrieve things like owner,
            // where it's not necessary to have.                
            entity.UpdateBasic (this.Arweave, true, false, false);

            return entity;
        }
        else
        {
            Sys.ERR_PROGRAM ("Could not set first TX from the query!", "ArFSEntity.FromTXQuery");  
            this.AddError ("PROGRAM ERROR: Could not deduce the first transaction of the entity.");
            Sys.Debug (query);
        }

        return null;
    }


    IsPublic          ()      { return this.Info?.IsPublic    == true;                             }
    IsEncrypted       ()      { return this.Info?.IsEncrypted == true;                             }
    GetInfo           ()      { return this.Info;                                                  }
    GetOwner          ()      { return this.Info?.Owner;                                           }
    GetPrivacy        ()      { return this.Info?.Privacy != null ? this.Info.Privacy 
                               : this.Info?.IsEncrypted ? "private" : "public";                    }
    GetName           ()      { return this.Info?.Name;                                            }
    GetLastModified   ()      { return this.Info?.LastModified;                                    }
    GetNewestMetaTXID ()      { return this.Info?.TXID_Latest;                                     }
    GetFirstMetaTXID  ()      { return this.Info?.TXID_Created;                                    }
    AddError          (error) { this.Info.Errors   = Util.Append (this.Info.Errors,   error, " "); }    
    AddWarning        (warn)  { this.Info.Warnings = Util.Append (this.Info.Warnings, warn,  " "); }    
    GetStatus         ()      { return this.Info?.MetaTXStatus;                                    }
    GetMetaStatusCode ()      { return this.Info?.MetaTXStatusCode;                                }
    GetDataStatusCode ()      { return this.Info?.DataTXStatusCode;                                }


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
                if ( (val = this.Info[sf]) != null)
                    status_info[sf] = val;
            }
            else if ( (val = this.Info[split[1]]) )
                status_info[split[0]] = val;
        }

        status_info.Errors = [];

        // Copy main errors
        if (this.Info?.Errors != null)                
            Util.CopyKeysToObj (this.Info.Errors, status_info.Errors);

        // Copy content errors
        if (this.Info?.Content?.Errors != null)                
            Util.CopyKeysToObj (this.Info.Content.Errors, status_info.Errors);
        

        if (this.Info.MetaTXStatusCode != null && this.Info.MetaTXStatusCode == 404)
            status_info.Errors = Util.AppendToArray (status_info.Errors, "Metadata TX not found.");

        if (this.Info.DataTXStatusCode != null && this.Info.DataTXStatusCode == 404)
            status_info.Errors = Util.AppendToArray (status_info.Errors, "Data TX doesn't seem to exist.");            




        // Categorize TX-state
        const safe_confirmations = State.Config.SafeConfirmationsMin;

        const confirmed = (this.Info.MetaTXStatusCode == 200 && this.Info.MetaTXConfirmations >= safe_confirmations) &&
                        (this.Info.DataTXStatusCode == null || (this.Info.DataTXStatusCode == 202 && this.Info.DataTXConfirmations >= safe_confirmations) );

        const mined   = (this.Info.MetaTXStatusCode == 200 && this.Info.MetaTXConfirmations < safe_confirmations) &&
                        (this.Info.DataTXStatusCode == null || (this.Info.DataTXStatusCode == 202 && this.Info.DataTXConfirmations < safe_confirmations) );                        

        const pending = (this.Info.MetaTXStatusCode != null && this.Info.MetaTXStatusCode == 202) ||
                        (this.Info.DataTXStatusCode != null && this.Info.DataTXStatusCode == 202);

        const failed  = (this.Info.MetaTXStatusCode == null || this.Info.MetaTXStatusCode == 404) ||
                        (this.Info.DataTXStatusCode != null && this.Info.DataTXStatusCode == 404);                        

        if (failed)
            status_info.Errors = Util.AppendToArray (status_info.Errors, "The " + this.EntityType + " failed to be properly mined to Arweave.");
    
        if (this.Info?.Content?.OrphanedEntities >= 1)
            status_info.Errors = Util.AppendToArray (status_info.Errors, 
                (this.Info.Content.OrphanedEntities == 1 ? "One orphaned entity found." : this.Info.Content.OrphanedEntities + " orphaned entities found.") );



        // Report
        status_info.Status = "???";
        status_info.Analysis = "The " + this.EntityType;



        if (status_info.Errors?.length >= 1)
        {
            status_info.Status = "FAULTY";            

            status_info.Analysis += " has some errors."

            if (this.Info.MetaTXStatusCode == null)
                status_info.Analysis += " It seems that the status for the metadata could not be retrieved. This shouldn't be the case, "
                                     +  "indicating a possible program error. Run the thing with --verbose or --debug for any clues of "
                                     +  "why this might be happening - feel free to poke me about it. Contact details at 'INFO Silanael'.";

            else if (this.Info.MetaTXStatusCode == 404)
                status_info.Analysis += " The metadata-TX is for some reason not found. This is rather strange. "
                                     +  "You could try running the thing with --verbose or --debug for any clues of "
                                     +  "why this might be happening, or poke me about it. Contact details at 'INFO Silanael'.";

            if (this.Info.DataTXID != null && this.info.DataTXStatusCode != null)
                status_info.Analysis += " The status of the Data TX could not be retrieved for some reason. "
                                     +  "You could try running the thing with --verbose or --debug for any clues of "
                                     +  "why this might be happening, or poke me about it. Contact details at 'INFO Silanael'.";

            if (this.Info.DataTXID != null && this.Info.DataTXStatusCode != null && this.Info.DataTXStatusCode == 404)
                status_info.Analysis += " The data TX seems to be missing. This is the actual file data of the file."
                                     + " This may happen during times of high network congestion when uploading without "
                                     + " using a bundler. Re-uploading the file should solve the issue, though do "
                                     + " manually confirm that the transaction " + this.Info.DataTXID + " doesn't exist. "
                                     + " A block explorer such as "
                                     + "https://viewblock.io/arweave/tx/" + this.Info.DataTXID + " can be used,"
                                     + " or SART's command: 'INFO TX " + this.info.DataTXID + "'."

            if (this.Info.IsOrphaned)
            {
                status_info.Analysis += " It seems to be orphaned, "

                if (this.Info.ParentStatusCode == 404)
                {
                    if (this.Info.DriveStatusCode == 404)
                        status_info.Analysis += "Both the containing drive (" + this.Info.DriveID + ") and "

                    status_info.Analysis += "parent folder (" + this.Info.ParentFolderID + ") appearing to not exist. Verify this yourself.";
                }
                else if (this.Info.DriveStatusCode == 404)
                    status_info.Analysis += "the containing drive (" + this.Info.DriveID + ") appearing to not exist. Verify this yourself."

                else
                    status_info.Analysis += " somehow. Can't determine how exactly, seems to be a program error. Give me a poke about it. "

                status_info.Analysis += " The issue can be remedied by creating the missing ArFS-entities. SART can't do this yet"
                                     +  " but it should be able to in the near future. For public drives, these entities can be created"
                                     +  " by hand with a tool such as Arweave-Deploy. "
            }

            if (this.Info.Content?.OrphanedEntities > 0)
                status_info.Analysis += " This thing seems to contain some orphaned files/folders, ie. ones that"
                                     +  " are contained in a folder that doesn't exist. These folders are missing: "
                                     + this.Info.Content?.MissingFolders?.toString () + " - the issue can be solved by creating"
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


    async UpdateBasic (arweave, update_tx = true, update_meta = true, verify = true)
    {
        const latest_txid = this.GetNewestMetaTXID ();

        if (latest_txid != null)
        {
            const txentry = update_tx   ? await this.__FetchTXEntry (arweave, latest_txid) : null;
            const meta    = update_meta ? await this.__FetchMeta    (arweave, latest_txid) : null;
            
            const state = await this.__GetState (arweave, meta, txentry, verify);
            Util.CopyKeysToObj (state, this.Info);            

            if (meta != null)
                this.NewestMeta = meta;
        }
        else
            Sys.ERR_PROGRAM ("Entity.GetNewestMetaTXID returned null.", "GQL.UpdateBasic", {once: true} );
    }

  

    async UpdateDetailed (arweave, verify = true, content = true)
    {
        if (this.Transactions == null)
        {
            Sys.ERR_PROGRAM ("Transactions not set for " + this.toString () );
            this.AddError ("PROGRAM ERROR: Could not update detailed info - Transactions not set.");
            return;
        }
        
        if (this.Info == null)
            this.Info = {};


        // (Re)build history
        const history = [];
        const fileversions = {};
        
        let oldstate, newstate = {};
        let msg, str_changes;
        let newest_updated = false;

        for (const e of Object.values (this.Transactions.ByTXID) )
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
            if (txid == this.Info?.TXID_Latest)
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
            if (txid == this.Info?.TXID_Created)
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

        this.Info.History = history;

  
        if (Object.keys (fileversions)?.length >= 1)
            this.Info.Versions = fileversions;


        
        switch (this.EntityType)
        {
            case Constants_ArFS.ENTITYTYPE_DRIVE:

                const id    = this.Info != null ? this.Info['ArFS-ID'] : null;
                const owner = this.Info?.Owner;
        
                if (content)
                {
                    if (id != null && owner != null)
                    {
                        Sys.INFO ("Retrieving drive content. This may take a while.");
                        const query = new ArFSDriveContentQuery (arweave);
                        const results = await query.Execute (id, owner);

                        if (results != null)
                            this.Info.Content = results.Info;
                    }
                    else
                        Sys.ERR ("Could not retrieve drive content, either of these is null: " + id + " or " + owner);
                }
            
                break;
            
            case Constants_ArFS.ENTITYTYPE_FOLDER:
                // Passthrough intentional.

            case Constants_ArFS.ENTITYTYPE_FILE:

                // Verify that the drive metadata exists
                if (this.Info?.DriveID != null)
                {
                    const query = new ArFSEntityQuery (arweave);
                    const de = await query.Execute (this.Info.DriveID, Constants_ArFS.ENTITYTYPE_DRIVE);

                    if (de == null)
                    {                                                
                        this.Info.IsOrphaned      = true;
                        this.Info.Errors          = Util.AppendToArray (this.Info.Errors, "Metadata for the drive (" + this.Info.DriveID + ") missing!");
                        this.Info.DriveStatus     = " !!! DRIVE METADATA MISSING !!!";  
                        this.Info.DriveStatusCode = 404;
                    }
                    else                
                    {
                        await de.UpdateBasic (arweave);
                        this.Info.DriveStatus     = de.GetStatus ();
                        this.Info.DriveStatusCode = de.GetMetaStatusCode ();
                    }
                }
                
                // Verify that the parent folder exists, ie. that the entry isn't orphaned.
                if (this.Info?.ParentFolderID != null)
                {
                    const query = new ArFSEntityQuery (arweave);
                    const pfe = await query.Execute (this.Info.ParentFolderID, Constants_ArFS.ENTITYTYPE_FOLDER);
                    
                    if (pfe == null)
                    {                        
                        this.Info.IsOrphaned       = true;
                        this.Info.Errors           = Util.AppendToArray (this.Info.Errors, "Parent folder " + this.Info.ParentFolderID + " does not exist.");
                        this.Info.ParentStatus     = "!!! FOLDER DOES NOT EXIST !!!";
                        this.Info.ParentStatusCode = 404;
                    }
                    else
                    {
                        await pfe.UpdateBasic (arweave);
                        this.Info.ParentStatus     = pfe.GetStatus ();
                        this.Info.ParentStatusCode = pfe.GetMetaStatusCode ();                        
                    }
                }
                break;
                
            default:
                break;
        }            
        
    }




    async __GetState (arweave, metadata, tx_entry, check_txstatus = false)
    {
        let state = {}        

        if (metadata != null)
        {
            state = Util.AssignIfNotNull (metadata.name,                                 state, "Name");
            state = Util.AssignIfNotNull (metadata.rootFolderId,                         state, "RootFolderID");
            state = Util.AssignIfNotNull (metadata.size,                                 state, "Size");
            state = Util.AssignIfNotNull (metadata.lastModifiedDate,                     state, "FileLastModified");
            state = Util.AssignIfNotNull (metadata.dataTxId,                             state, "DataTXID");

            if (check_txstatus && state.DataTXID != null)
            {
                const status = await arweave.GetTXStatusInfo (state.DataTXID);
                state.DataTXStatus        = status?.Status;            
                state.DataTXStatusCode    = status?.StatusCode;
                state.DataTXConfirmations = status?.Confirmations;
            }
        }

        if (tx_entry != null)
        {
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_FILEID),         state, "FileID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_DRIVEID),        state, "DriveID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_FOLDERID),       state, "FolderID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_PARENTFOLDERID), state, "ParentFolderID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_CIPHER),         state, "Cipher");
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_CIPHER_IV),      state, "Cipher-IV");
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_DRIVEPRIVACY),   state, "DrivePrivacy");
            state = Util.AssignIfNotNull (tx_entry.GetTag (Constants_ArFS.TAG_DRIVEAUTHMODE),  state, "DriveAuthMode");    
                        
            state.IsEncrypted = state.DrivePrivacy == "private" || state.Cipher != null;
            state.IsPublic    = !state.IsEncrypted;

            if (check_txstatus)
            {
                const status = await tx_entry.UpdateAndGetStatus ();
                state.MetaTXStatus        = status?.Status;
                state.MetaTXStatusCode    = status?.StatusCode;
                state.MetaTXConfirmations = status?.Confirmations;
            }
        }
        else
            Sys.ERR_PROGRAM ("tx_entry null.", "Entity.__GetState", { once: true });

        return state;
    }


    async __FetchMeta (arweave, txid)
    {
        const existing = this.MetaByTXID[txid];
        
        if (existing != null)
        {
            Sys.VERBOSE ("Cached metadata found for TXID " + txid);
            return existing;
        }

        if (! this.IsPublic () )
        {
            Sys.VERBOSE ("Drive not public, unable to fetch metadata.");
            return null;
        }

        try
        {
            const meta = JSON.parse (await arweave.GetTxStrData (txid) );
            this.MetaByTXID[txid] = meta;
            return meta;        
        }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Entity.__FetchMeta (" + txid + ")"); }   
    
        return null;
    }


    async __FetchTXEntry (arweave, txid)
    {
        const existing = this.Transactions?.GetByTXID (txid);
        
        if (existing != null)
        {
            Sys.VERBOSE ("Cached TX entry found for TXID " + txid);
            return existing;
        }

        else
        {
            Sys.ERROR ("TX-entry for " + txid + " not found for some reason - fetching:");

            const owner = this.GetOwner ();

            if (owner != null)
            {
                try
                {
                    const query = new ByTXQuery (arweave);
                    const tx = await query.Execute (txid, owner);

                    if (tx != null)
                        this.AddTransaction (tx)                   
                                        
                    else
                        Sys.ERR ("Failed to retrieve TX " + txid, "Entity.__FetchTXEntry");

                    return tx;
                }
                catch (exception) { Sys.ON_EXCEPTION (exception, "Entity.__FetchTXEntry (" + txid + ")"); } 
            }
            else        
                Sys.ERR ("... or not fetching after all. The Owner-address isn't set. Program error.", "Entity.__FetchTXEntry");
                            
        }        
        return null;
    }

    __UpdateStateToNewest (state)
    {
        if (state != null)            
            Util.CopyKeysToObj (state, this.Info);        
    }

}








module.exports = ArFSEntity;

