//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// GQL.js - 2021-10-19_01
// Code to create and run GraphQL-queries
//

// Imports
const Constants = require ("./CONST_SART.js");
const State     = require ("./ProgramState.js");
const Settings = require ('./settings.js');
const Sys      = require ('./sys.js');
const Util     = require ('./util.js');
const ArFSDefs = require ('./CONST_ARFS.js');
const STX      = require ('./Transaction.js');
const TXTag    = require ("./TXTag.js");












// My first class written in JavaScript. Yay.
// I've been holding back with them a bit,
// enjoying the oldschool C-type programming
// while it lasted.
class Query
{    
    Arweave       = null;
    Edges         = null;
    Sort          = null;


    // How does one make these things protected?
    constructor (arweave)
    {
        if (arweave == null)
            return Sys.ERR_ABORT ("Query constructor: Missing parameter 'Arweave'.", "GQL");

        this.Arweave       = arweave;
            
        this.Edges         = null;
        this.EntriesAmount = 0;
    }

    // Overridable
    _ProcessEdges () { Sys.ERR_PROGRAM ("_ParseEntries not properly overridden by a subclass", "GQL.Query"); }


    async ExecuteOnce (query)
    {
        if (query != null)
            this.Query = query;
 
        Sys.DEBUG (query);
 
        const arweave = await this.Arweave.Init ();
        if (arweave != null)
        {
            this.Results  = await RunGQLQuery (this.Arweave, this.Query)
                     
            this.Edges         = this.Results?.data?.data?.transactions?.edges;
            this.EntriesAmount = this.Edges != null ? this.Edges.length : 0;
            this._ProcessEdges ();
        }
        else
        {
            this.Results       = null;
            this.Edges         = null;
            this.EntriesAmount = null;
            this.Entries       = [];
        }
    }
    
    DidQuerySucceed  ()           { return this.Results?.status == HTTP_STATUS_OK;         }
    GetEdgesAmount   ()           { return this.Edges != null ? this.Edges.length : 0;     }
    GetEdge          (index)      { return this.Edges != null ? this.Edges[index] : null;  }
    GetEdges         ()           { return this.Edges                                      }
    

}




class TXQuery extends Query
{

    Transactions = new STX.TXGroup (this.Sort);

    constructor (arweave, query)
    {
        super (arweave, query);        
    }

    GetTransactions       ()      { return this.Transactions                                              }
    GetTransactionsAmount ()      { return this.Transactions != null ? this.Transactions.GetAmount () : 0 }
    GetTransactionByTXID  (txid)  { return this.Transactions.GetByTXID  (txid);                           }
    GetTransactionByIndex (index) { return this.Transactions.GetByIndex (index);                          }

    SetSort (sort)
    {
        this.Sort = sort;
        this.Transactions?.SetSort (sort);        
    }
    
    /* Override */ _ProcessEdges ()
    {
        this.Edges?.forEach (edge => this.Transactions.AddFromGQLEdge (edge) );   
    }


    static CreateTxQuery ( config = { cursor: undefined, first: GQL_MAX_RESULTS, owner: undefined, tags: [], sort: SORT_DEFAULT, id:null } )
    {
    
        // No proper query arguments given
        if (config.cursor == undefined && config.owner == undefined && config.tags?.length <= 0)
            Sys.ERR_OVERRIDABLE ("No proper query terms given, would fetch the entire blockchain.", __TAG);


        const cursor_str = config.cursor != undefined ? `after:  "${config.cursor}" ,` : "";
        const first_str  = config.first  != undefined ? `first:   ${config.first}   ,` : "";        
        const owner_str  = config.owner  != undefined ? `owners: "${config.owner}"  ,` : "";
        const sort_str   = config.sort   != undefined ? `sort:    ${config.sort}    ,` : "";
        const id_str     = config.id     != undefined ? `ids:    "${config.id}"     ,` : "";
        const tag_str    = TXTag.TAGS_TO_GQL (config.tags) + ",";

        let block_str = "";
        const minblock = State.Config.QueryMinBlockHeight;
        const maxblock = State.Config.QueryMaxBlockHeight;
        if (minblock != null || maxblock != null)
        {            
            block_str = "block: {" + (minblock != null ? "min:" + minblock + "," : "") 
                                   + (maxblock != null ? "max:" + maxblock       : "") + " },";
        }


        return `
        query 
        {
            transactions
            (             
              ${cursor_str}
              ${first_str}
              ${id_str}
              ${block_str}
              ${sort_str}
 
              ${owner_str}
              ${tag_str}                    
            )
            {
              edges
              {
                cursor
                node
                {              
                  id,
                  owner    { address },
                  block    { id,height,timestamp },
                  tags     { name, value },
                  fee      { ar, winston },
                  quantity { ar, winston },
                  data     { size, type },
                  recipient
                }
              }
            }
        }
        `;
   }

   

   /* Returns true if desired amount of entries was gotten, false if not. Owner must be specified. */
   async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT, id: null} )
   {
        if (config?.owner != null)
        {
            const ret = await this.Execute (config);
            return ret;
        }
        else
            return false; // TODO: Add error
   }

  

   /* Returns true if desired amount of entries was gotten, false if not */
   async Execute ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: Constants.GQL_SORT_DEFAULT, id: null} )
   {    

        if (config.sort == null)
        {
            config.sort = Constants.GQL_SORT_DEFAULT;
            Sys.WARN ("Sort not set, using default ´" + config.sort + "`.", "TXQuery.Execute", { error_id: Constants.ERROR_IDS.SORT_NOT_SET} )
        }
        
        this.Transactions = new STX.TXGroup (config.sort);
        this.SetSort (config.sort);


        if (config.owner != null && !Util.IsArweaveHash (config.owner) )
            return Sys.ERR ("Invalid owner '" + config.owner + "'", "TXQuery.Execute");
       
        let results       = null;
        let cursor        = undefined;       
        let total_entries = 0;
        let pass_edges    = null;
        let pass_entries  = 0;
        let pass_num      = 1;
        let edges         = [];
        let fail          = false;
       
        const desired_amount = config.first != undefined ? config.first : 0;
        const fetch_amount   = config.first != undefined ? config.first : Constants.GQL_MAX_RESULTS;

        


       Sys.DEBUG ("Starting to fetch transactions..", "TXQuery.Execute");

       do
       {        
           Sys.DEBUG ("Pass #" + pass_num + " begin:", "TXQuery.Execute");
           
           const q_str = TXQuery.CreateTxQuery
           ( 
               { 
                   "cursor" : cursor, 
                   "first"  : fetch_amount, 
                   "owner"  : config.owner, 
                   "tags"   : config.tags, 
                   "sort"   : config.sort 
               } 
           );                         
           
           results = await RunGQLQuery (this.Arweave, q_str);
           
           if (results == null)
           {
               Sys.ERR   ("GQL-query failed.", "TXQuery.Execute");
               Sys.DEBUG ("RunGLQuery returned null.", "TXQuery.Execute");
               return false;
           }
           
           pass_edges = results?.data?.data?.transactions?.edges;
           
           if (pass_edges == undefined)
           {               
               Sys.ERR ("Query failed at pass #" + pass_num + ". Errors: " + Util.ObjToStr (results?.data?.errors) );
               Sys.DEBUG ("Query results:", "TXQuery.Execute");
               Sys.DEBUG (results);

               fail = true;              
               break;
           }

           pass_entries   = pass_edges.length;
           total_entries += pass_entries;     

           if (pass_entries > 0)
           {
               cursor = pass_edges.at(-1).cursor;
               edges  = edges.concat (pass_edges)

               Sys[pass_num <= 0 ? "DEBUG" : "VERBOSE"]("TX fetch pass #" + String(pass_num).padStart (4, "0") + ": " 
                    + pass_entries + " transactions received (" + total_entries + " total).", "TXQuery.Execute");       

               ++pass_num;
           }       
           else
           {
               Sys.DEBUG ("Got no entries on pass #" + pass_num, "TXQuery.Execute");
               break;
           }
                   
       } while ( (pass_entries >= fetch_amount && desired_amount == 0) || total_entries < desired_amount)
       

       // Save the query results
       this.Results       = results;  
       this.Edges         = edges;
       this.EntriesAmount = edges.length;
       this._ProcessEdges ();


       Sys.VERBOSE ("Fetched " + this.EntriesAmount + (desired_amount > 0 ? " / " + desired_amount : "") + " transactions.", "TXQuery.Execute")   
       
       
       return !fail && this.EntriesAmount >= desired_amount;
   }

    
}








class ArFSDriveQuery extends TXQuery
{
   
   /* Override */ async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT} )
   {
       Sys.ERR ("ExecuteReqOwner not applicable to this query type.", this);
       return false;        
   }
   

   async Execute (owner = null, deep = false)
   {       
        this.Sort = SORT_NEWEST_FIRST;

    

        const results = 
        { 
            Info:
            {
                Address:     owner,
                ScanType:    deep ? "Deep" : "Quick",
                DrivesFound: 0,
                Errors:      0, 
                Drives:      {}
            },
            
            DriveEntities:  {},
            ProcessedIDs:   {},
        
            RECURSIVE_FIELDS: ["Drives"],
        };
    

        // Deep scan - look for all files on the address and pick unique Drive-IDs.
        //
        if (deep)
        {            
            if (owner == null)
            {
                Sys.ERR ("Owner needs to be set for deep scan. Was null.", "ArFSDriveQuery");
                return null;
            }

            Sys.INFO ("Performing a deep scan for drives on " + owner + " ...");

            const tags = 
            [ 
                Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPES_INFOLDER),
            ];
            TXTag.ADD_NATIVE_TAGS (tags, State.Config.ArFSTXQueryTags);

            await super.Execute
            (            
                {
                    owner: owner,
                    sort:  this.Sort,
                    tags:  tags,                
                }
            );

            // Go through the entries
            if (this.Entries != null)
            {
                // Look for unique Drive-IDs
                for (const e of this.Entries)
                {
                    const drive_id = e?.GetTag (ArFSDefs.TAG_DRIVEID);
                    results.ProcessedIDs[drive_id] = true;
                }

                // Try to get the drive-entities
                let found = 0;            
                for (const d of Object.keys (results.ProcessedIDs) )
                {
                    await this.__ProcessDrive (d, results);
                    ++found;
                }

                results.Info.DrivesFound = found;
            }

        }
        
        // Regular scan, just look for Entity-Type = drive.
        else
        {
            const tags = 
            [ 
                Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE, ArFSDefs.ENTITYTYPE_DRIVE),
            ];
            TXTag.ADD_NATIVE_TAGS (tags, State.Config.ArFSTXQueryTags);

            Sys.INFO ("Performing a surface scan for drives on " + (owner != null ? owner + " ..." : "the entire Arweave. Might take a while...") );
            
            await super.Execute
            (            
                {
                    owner: owner,
                    sort:  this.Sort,
                    tags:  tags,                
                }
            );

            const all_entries = this.Entries;

            if (all_entries != null && all_entries.length > 0)
            {
                for (const e of this.Entries)
                {
                    const drive_id = e?.GetTag (ArFSDefs.TAG_DRIVEID);

                    if (drive_id != null && results.ProcessedIDs[drive_id] == null)
                    {
                        results.ProcessedIDs[drive_id] = true;
                        await this.__ProcessDrive (drive_id, results);                    
                    }
                }
            }

            results.Info.DrivesFound = Object.keys (results.Info.Drives)?.length;
        }

        return results;
   }

   async __ProcessDrive (drive_id, results)
   {
        // I could have parsed the entries I already got, but
        // doing it in multiple different ways is asking for trouble.
        const drive_entity_query = new ArFSEntityQuery (this.Arweave);
        const drive_entity       = await drive_entity_query.Execute (drive_id, ArFSDefs.ENTITYTYPE_DRIVE);

        if (drive_entity != null)
        {
            await drive_entity.UpdateBasic (this.Arweave, true, true, true);
            results.DriveEntities[drive_id] = drive_entity;

            const drive_owner  = drive_entity.GetOwner   ();
            const name         = drive_entity.GetName    ();
            const privacy      = drive_entity.GetPrivacy ();
            const encrypted    = drive_entity.IsEncrypted ();
            let lastmodif      = drive_entity.GetLastModified ();

            if (lastmodif == null)
                lastmodif = Util.GetDummyDate ();

            results.Info.Drives[drive_id] = (drive_owner != null ? drive_owner + "  " : "" )
                                            + lastmodif + "  "
                                            + (privacy != null ? privacy.padEnd (8, " ") : "UNKNOWN") + " "                                                       
                                            + (name != null ? name : "")

        }
        else
        {
            results.Info.Drives[drive_id] = "!!! FAILED TO RETRIEVE DRIVE-ENTITY !!!";
            results.Info.Errors += 1;
        }
   }

}


class ArFSDriveContentQuery extends TXQuery
{       
    async Execute (drive_id, owner)
    {       

        this.Sort = SORT_NEWEST_FIRST;

        if (drive_id == null)
            return Sys.ERR_PROGRAM ("drive_id null", "ArFSDriveContentQuery");

        if (owner == null)
            return Sys.ERR_PROGRAM ("owner null", "ArFSDriveContentQuery");



        const tags = 
        [ 
            Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE,    ArFSDefs.ENTITYTYPES_INFOLDER),
            Tag.QUERYTAG (ArFSDefs.TAG_DRIVEID,       drive_id),
        ];
        TXTag.ADD_NATIVE_TAGS (tags, State.Config.ArFSTXQueryTags);
        

        await super.Execute
        (            
            {
                owner: owner,          
                sort:  this.Sort,
                tags:  tags,                
            }
        );

        const report = 
        {
            Info : 
            {
                Metadata        : 0,    
                UniqueFileIDs   : 0,
                UniqueFolderIDs : 0,
                OrphanedEntities: 0,
                OrphanedFiles   : 0,
                OrphanedFolders : 0,            
                UnknownEntities : 0,
                Errors          : null                
            },
            
            Files:           {},
            Folders:         {},
            All:             {},
            Orphaned:        {},
            OrphanedFiles:   {},
            OrphanedFolders: {},
            MissingFolders:  {},
            Parentless:      {},            
            Unknown:         {},
            EntityTypes:     {},
        }

        if (this.Entries != null)
        {
            report.Info.Metadata = this.Entries.length;

            let newer, error;

            for (const e of this.Entries)
            {
                const entity_type = e.GetTag (ArFSDefs.TAG_ENTITYTYPE);
                const id          = e.GetTag (ArFSDefs.GetIDTag (entity_type) );

                if (entity_type == null)
                {
                    error = "Entity-Type missing for " + e.GetTXID ();                    
                    Sys.ERR (error, drive_id);
                    report.Errors = Util.AppendToArray (report.Errors, error);
                    continue;
                }
                
                if (id == null)
                {
                    error = "ArFS-ID missing for " + e.GetTXID ();                    
                    Sys.ERR (error, drive_id);
                    report.Errors = Util.AppendToArray (report.Errors, error);                    
                    continue;
                }
                

                const obj = entity_type == ArFSDefs.ENTITYTYPE_FILE ? report.Files
                                                                    : entity_type == ArFSDefs.ENTITYTYPE_FOLDER ? report.Folders : report.Unknown;
                                        
                if (obj[id] == null || (newer = e.IsNewerThan (obj[id])) == true)
                {
                    obj                [id] = e;
                    report.All         [id] = e;
                    report.EntityTypes [id] = entity_type;

                    if (newer)
                        Sys.VERBOSE ("Overwrote "+ obj[id]?.GetTXID () + " with " + e.GetTXID () + " as the latter seems to be newer." );
                }

                else
                    Sys.VERBOSE ("Omitted " + e.GetTXID () + " as it was older than " + obj[id]?.GetTXID () );
                
            }

            // Look for orphaned
            for (const f of Object.entries (report.All) )
            {
                const entry            = f[1];
                const arfs_id          = f[0];
                const parent_folder_id = entry?.GetTag (ArFSDefs.TAG_PARENTFOLDERID);
                const txid             = entry?.GetTXID ();
                const entity_type      = report.EntityTypes[arfs_id];

                if (parent_folder_id == null)
                    report.Parentless[arfs_id] = entry;

                else if (report.Folders[parent_folder_id] == null)
                {
                    report.MissingFolders[parent_folder_id] = true;

                    if (report.Orphaned[arfs_id] == null || entry?.IsNewerThan (report.Orphaned[arfs_id]) )
                    {
                        report.Orphaned[arfs_id] = f[1];
                    
                        Sys.VERBOSE ("Orphaned entity found - ArFS-ID:" + arfs_id + " TXID:" + txid
                            + " - should be in folder " + parent_folder_id + " which doesn't exist.");

                        switch (entity_type)
                        {
                            case ArFSDefs.ENTITYTYPE_FILE:
                                report.OrphanedFiles[arfs_id] = entry;
                                error = "Orphaned file: " + arfs_id;
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;

                            case ArFSDefs.ENTITYTYPE_FOLDER:
                                report.OrphanedFolders[arfs_id] = entry;
                                error = "Orphaned folder: " + arfs_id;
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;

                            case ArFSDefs.ENTITYTYPE_DRIVE:
                                error = "There's a drive inside a drive? What the fuck? " + arfs_id;
                                Sys.ERR (error, drive_id);                                
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;

                            default:
                                error = "Orphaned with unknown Entity-Type [" + entity_type + "]: " + arfs_id;
                                Sys.ERR (error, drive_id);                                
                                report.Errors = Util.AppendToArray (report.Errors, error);
                                break;
                        }
                        if (report.Info.Orphans == null)
                            report.Info.Orphans = {};

                        report.Info.Orphans[arfs_id] = "TXID:" + txid + " (" + entity_type + ") - Missing:" + parent_folder_id;
                    }
                }

            }

            report.Info.UniqueFileIDs    = Object.keys (report.Files)           ?.length;
            report.Info.UniqueFolderIDs  = Object.keys (report.Folders)         ?.length;           
            report.Info.UnknownEntities  = Object.keys (report.Unknown)         ?.length;
            report.Info.OrphanedEntities = Object.keys (report.Orphaned)        ?.length;
            report.Info.OrphanedFiles    = Object.keys (report.OrphanedFiles)   ?.length;
            report.Info.OrphanedFolders  = Object.keys (report.OrphanedFolders) ?.length;
            
            let folder_ids = Object.keys (report.MissingFolders);
            if (folder_ids?.length >= 0)
            {
                report.Info.MissingFolders = [];
                for (const k of folder_ids)
                {
                    report.Info.MissingFolders.push (k);
                }
            }



            const parentless = Object.keys (report.Parentless)?.length;
            if (parentless > 1)
            {
                Sys.WARN ("Encountered " + parentless + " entities that lack " + ArFSDefs.TAG_PARENTFOLDERID +
                          + "It's normal to have one folder-entity like this (the root folder) but no more than that.");

                report.Errors = Util.AppendToArray (report.Errors, "Multiple folders with no Parent-Folder-Id -tag.");

                report.Info.Parentless = {};

                for (const e of report.Parentless)
                {
                    report.Info.Parentless[e[0]] = "TXID:" + e[1]?.GetTXID ();
                }
            }
        }

        return report;
    }
}




class LatestQuery extends TXQuery
{
   
   /** Retrieve drive's owner address. */
   async Execute (tags = [], address = null)
   {       
       this.Sort = SORT_NEWEST_FIRST;

        await super.ExecuteOnce
        (
            TXQuery.CreateTxQuery 
            ({                     
                    first:  1,
                    owner:  address,                     
                    sort:   this.Sort,
                    tags:   tags,                                        
            })
        );

        if (this.GetEntriesAmount () == 1)        
            return this.GetEntry (0);

        else
        {
            Sys.VERBOSE ("Could not find a transaction for tags: " + Util.ObjToStr (tags) );
            return null;
        }
   }
}

class ByTXQuery extends TXQuery
{
   
    /** Retrieve drive's owner address. */
    async Execute (txid, owner = null)
    {       
        this.Sort = SORT_OLDEST_FIRST;

        await super.ExecuteOnce
        (
            TXQuery.CreateTxQuery 
            ({                     
                    first:  1,
                    id:     txid,
                    owner:  owner,                     
                    sort:   this.Sort,                                                            
            })
        );

        const amount = this.GetEntriesAmount ();

        if (amount == 1)        
            return this.GetEntry (0);

        else if (amount == 0)
            Sys.VERBOSE ("GQL: Could not find TX", txid);
        
        else        
            Sys.ERR ("Invalid amounts of entries returned for a TX-query: " + amount, TXID);
            
        return null;        
    }
}






// Returns raw results.
async function RunGQLQuery (Arweave, query_str)
{            
    const arweave = await Arweave.Init ();

    if (arweave != null)
    {
        Sys.DEBUG ("Running query:");
        Sys.DEBUG (query_str);

        const results = await Arweave.Post (Settings.GetGQLHostString (), { query: query_str } );
        return results;
    }
    else
        return null;
    
}






function GetGQLValueStr (value)
{     
    if (Array.isArray (value) )
    {        
        let str = "";
        const len = value.length;
        for (let C = 0; C < len; ++C)
        {
            if (C > 0)
                str += `,"${value[C]}"`;
            else
                str += `"${value[C]}"`;
        }
        
        return str;
    }
    else
        return `"${value}"`;
}






module.exports = { RunGQLQuery, IsValidSort: Constants.IS_GQL_SORT_VALID,
                   Query, TXQuery, LatestQuery, ByTXQuery, ArFSDriveContentQuery, ArFSDriveQuery,
                   SORT_DEFAULT:           Constants.GQL_SORT_DEFAULT, 
                   SORT_HEIGHT_ASCENDING:  Constants.GQL_SORT_HEIGHT_ASCENDING, 
                   SORT_HEIGHT_DESCENDING: Constants.GQL_SORT_HEIGHT_DESCENDING,
                   SORT_OLDEST_FIRST:      Constants.GQL_SORT_OLDEST_FIRST,
                   SORT_NEWEST_FIRST:      Constants.GQL_SORT_NEWEST_FIRST   }