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
const ArFSDefs = require ('./ArFS_DEF.js');



// Constants
const GQL_MAX_RESULTS        = 100;

const SORT_HEIGHT_DESCENDING = 'HEIGHT_DESC';
const SORT_HEIGHT_ASCENDING  = 'HEIGHT_ASC';
const SORT_OLDEST_FIRST      = SORT_HEIGHT_ASCENDING;
const SORT_NEWEST_FIRST      = SORT_HEIGHT_DESCENDING;
const SORT_DEFAULT           = SORT_HEIGHT_ASCENDING;
const VALID_SORT             = [ SORT_HEIGHT_ASCENDING, SORT_HEIGHT_DESCENDING ];

const HTTP_STATUS_OK         = 200;

const __TAG                  = "GQL";

function IsSortValid (sort) { return VALID_SORT.includes (sort?.toUpperCase() ); }


class Tag
{
    name  = null;
    value = null;

    constructor (tagname, tagvalue)
    {
        this.name  = tagname;
        this.value = tagvalue;        
    }

    static QUERYTAG (tagname, value)
    {                
        return new Tag (tagname, value);
    }

    static QUERYTAG (tagname, value = [])
    {                
        return new Tag (tagname, value);
    }

    static APPENDNATIVETAGS (tag_array, dest)
    {
        if (tag_array == null || dest == null || tag_array.length <= 0)
            return;

        for (const t of tag_array)
        {
            if (t.name != null && t.values != null)
                dest.push (Tag.QUERYTAG (t.name, t.values) );
            else
                Sys.ERR_ONCE ("Tag not in corrent format - need to be { name:'foo', values:['bar','baz'] } - " + Util.ObjToStr (t), "Tag.APPENDNATIVETAGS" );
        }
    }
}




class Entry
{
    TXID           = null;
    Owner          = null;
    BlockHeight    = null;
    BlockID        = null;
    Tags           = null;
    Timestamp      = null;
    Fee_AR         = null;
    Fee_Winston    = null;
    Quantity_AR    = null;
    Quantity_Winston= null;
    DataSize_Bytes = null;
    Recipient      = null;
    
    
    constructor (edge) //txid, owner, block, tags, timestamp)
    { 
        if (edge != null)
        {
            this.TXID             = edge.node?.id,
            this.Owner            = edge.node?.owner?.address,
            this.BlockID          = edge.node?.block?.id         != null ? edge.node.block.id         : null;
            this.BlockHeight      = edge.node?.block?.height     != null ? Number (edge.node.block.height)     : null;
            this.Tags             = edge.node?.tags              != null ? edge.node?.tags : [];
            this.Timestamp        = edge.node?.block?.timestamp  != null ? Number (edge.node.block.timestamp)  : null;
            this.Fee_Winston      = edge.node?.fee?.winston      != null ? Number (edge.node.fee.winston)      : null;
            this.Fee_AR           = edge.node?.fee?.ar           != null ? Number (edge.node.fee.ar)           : null;
            this.Quantity_Winston = edge.node?.quantity?.winston != null ? Number (edge.node.quantity.winston) : null;
            this.Quantity_AR      = edge.node?.quantity?.ar      != null ? Number (edge.node.quantity.ar)      : null;
            this.DataSize_Bytes   = edge.node?.data?.size        != null ? Number (edge.node.data.size)        : null;
        }
    }

    static FromTX (tx, owner)
    {        
        if (tx != null)
        {
            const entry = new Entry ();

            if (Settings.IsForceful () || State.Config.MaxTXFormat == null || tx.format <= State.Config.MaxTXFormat)
            {
                entry.TXID             = tx.id;
                entry.Owner            = owner;
                entry.BlockHeight      = null;                
                entry.Timestamp        = null;
                entry.Fee_Winston      = Number (tx.reward);
                entry.Fee_AR           = null;
                entry.Quantity_Winston = Number (tx.quantity);
                entry.Quantity_AR      = null;
                entry.DataSize_Bytes   = Number (tx.data_size);

                // TODO: Remove this hack, unify everything to use TXTag.
                const tags = Util.DecodeTXTags (tx);
                entry.Tags = [];
                for (const t of tags)
                {
                    entry.Tags.push ( {name:t.Name, value:t.Value} )
                }
            }
            else
                Sys.ERR ("Unsupported transaction format/version '" + tx.format + "'. Use --force to process anyway.");

            return entry;
        }
        else
            return null;
    }


    GetTXID        ()    { return this.TXID;                                                     }
    GetOwner       ()    { return this.Owner;                                                    }
    GetBlockID     ()    { return this.BlockID;                                                  }
    GetBlockHeight ()    { return this.BlockHeight;                                              }
    GetBlockTime   ()    { return this.Timestamp;                                                }
    GetDate        ()    { return this.Timestamp != null ? Util.GetDate (this.Timestamp) : null; }
    GetFee_AR      ()    { return this.Fee_AR           != null ? this.Fee_AR           : 0;     }
    GetQTY_AR      ()    { return this.Quantity_AR      != null ? this.Quantity_AR      : 0;     }
    GetFee_Winston ()    { return this.Fee_Winston      != null ? this.Fee_Winston      : 0;     }
    GetQTY_Winston ()    { return this.Quantity_Winston != null ? this.Quantity_Winston : 0;     }    
    GetDataSize_B  ()    { return this.DataSize_Bytes   != null ? this.DataSize_Bytes   : 0;     }
    GetRecipient   ()    { return this.Recipient;                                                }
    HasFee         ()    { return this.Fee_AR           != null && this.Fee_AR         > 0;      }
    HasTransfer    ()    { return this.Quantity_AR      != null && this.Quantity_AR    > 0;      }
    HasData        ()    { return this.DataSize_Bytes   != null && this.DataSize_Bytes > 0;      }
    HasRecipient   ()    { return this.Recipient != null;                                        }    
    HasTag         (tag) { return this.Tags.find (e => e.name == tag) != null;                   }
    IsMined        ()    { return this.BlockHeight != null && this.BlockHeight >= 0;             }
    GetTags        ()    { return this.Tags; }
    IsNewerThan    (e)   { return this.BlockHeight > e?.BlockHeight;                             }

    

    GetTag (tag)
    { 
        const r = this.Tags?.find (e => e.name == tag);
        return r != null ? r.value : null;
    }

    WithTag (name, value)
    {
        if (this.Tags == null) 
            this.Tags = [];

        this.Tags.push (new Tag (name, value) );
        
        return this; 
    }

    /** Set value to null to get entries that contain the tag (with any value). */
    static GetEntriesByTag (entries, tag, value = null)
    {
        const ret = [];
        if (entries != null)
        {
            for (const e of entries)
            {
                if (value == null)
                {
                    if (e.HasTag (tag) ) 
                        ret.push (e);        
                }
                else if (e.GetTag (tag) == value)
                    ret.push (e);                
            }
        }
        return ret;
    }


    static GetEntriesByOwner (entries, owner)
    {
        const ret = [];

        if (owner == null)
        {
            Sys.ERR ("PROGRAM ERROR: owner null", "Entry.GetEntriesByOwner");
            return ret;
        }
        
        if (entries != null)
        {
            for (const e of entries)
            {
                if (e.GetOwner () == owner)
                    ret.push (e);                
            }
        }
        return ret;
    }

    static GetOldestEntry (entries, sort)
    {
        if (entries == null)
        {
            Sys.ERR ("PROGRAM ERROR: entries null", "Entry.GetOldestEntry");
            return null;
        }

        if (sort == null)
        {
            Sys.ERR ("PROGRAM ERROR: entries null", "Entry.GetOldestEntry");
            return null;
        }

        else if (entries.length <= 0)
            return null;

        else if (entries.length == 1)
            return entries[0];

        else
        {

            let oldest = this.Sort == SORT_OLDEST_FIRST ? entries[0]
                                                        : sort == SORT_NEWEST_FIRST ? entries [entries.length - 1]
                                                                                         : null;

            Sys.DEBUG ("Initial set oldest to " + (oldest == null ? oldest.GetTXID () : null ) );

            const debug = Settings.IsDebug ();

            for (const e of entries)
            {
                if (oldest == null || e.GetBlockHeight () < oldest.GetBlockHeight () )
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID + " at block height " + e.GetBlockHeight () + " is older than " 
                                    + (oldest != null ? oldest.GetTXID () + " at " + oldest.GetBlockHeight () : null) );
                    oldest = e;                    
                }
            }
            
            if (oldest == null)
                Sys.ERR ("Could not determine oldest entry out of " + entries?.length + " entries!", "Entry.GetOldestEntry");

            else
                Sys.VERBOSE ("Determined that " + oldest.GetTXID () + " at block height " + oldest.GetBlockHeight () + " is the oldest entry.");

            return oldest;
        }
    }          


    static GetNewestEntry (entries, sort, owner = null)
    {
        if (entries == null)
        {
            Sys.ERR ("PROGRAM ERROR: entries null", "Entry.GetOldestEntry");
            return null;
        }

        if (sort == null)
        {
            Sys.ERR ("PROGRAM ERROR: entries null", "Entry.GetOldestEntry");
            return null;
        }

        else if (entries.length <= 0)
            return null;

        else if (entries.length == 1)
            return entries[0];

        else
        {
            let newest = Entry.GetOldestEntry (entries, sort);
            const debug = Settings.IsDebug ();

            for (const e of entries)
            {
                if (owner != null && e.GetOwner () != owner)
                {
                    Sys.WARN (`Found an entry that doesn't match the owner ${owner}
TXID: ${e.GetTXID ()}  at address ${e.GetOwner ()}
${Sys.ANSIRED()}Possible hostile collision attempt from ${e.GetOwner ()}.${Sys.ANSICLEAR()}`);
                    Sys.DEBUG (e);
                }

                else if (newest == null || (e.GetBlockHeight () > newest.GetBlockHeight () ) )
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID + " at block height " + e.GetBlockHeight () + " is newer than " 
                                    + (newest != null ? newest.GetTXID () + " at " + newest.GetBlockHeight () : null) );
                    newest = e;                    
                }
            }
            
            if (newest == null)
                Sys.ERR ("Could not determine oldest entry out of " + entries?.length + " entries!", GQL.Query);

            else
                Sys.VERBOSE ("Determined that " + newest.GetTXID () + " at block height " + newest.GetBlockHeight () + " is the newest entry.");

            return newest;
        }
    }

}



// My first class written in JavaScript. Yay.
// I've been holding back with them a bit,
// enjoying the oldschool C-type programming
// while it lasted.
class Query
{
    Arweave       = null;
    Edges         = null;
    Entries       = [];
    EntriesAmount = null;
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
            this._ParseEntries ();
        }
        else
        {
            this.Results       = null;
            this.Edges         = null;
            this.EntriesAmount = null;
            this.Entries       = [];
        }
    }
     
    
    GetTXID          (index)      { return this.GetEdge (index)?.node?.id;                 }
    GetAddress       (index)      { return this.GetEdge (index)?.node?.owner?.address;     }
    GetBlockHeight   (index)      { return this.GetEdge (index)?.node?.block?.height;      }
    GetTags          (index)      { return this.GetEdge (index)?.node?.tags;               }    
    HasTag           (index, tag) { return this.GetTag  (index, tag) != undefined;         }
    GetEdge          (index)      { return this.Edges != null ? this.Edges[index] : null;  }
    GetEdges         ()           { return this.Edges                                      }
    GetEntriesAmount ()           { return this.EntriesAmount;                             }
    GetEntry         (index)      { return this.Entries[index];                            }
    DidQuerySucceed  ()           { return this.Results?.status == HTTP_STATUS_OK;         }
    

    GetOldestEntry ()
    {
        if (this.Entries == null)
        {
            Sys.ERR ("No entries present. Has query been executed?", "Query");
            return null;
        }

        else if (this.Entries.length <= 0)
            return null;

        else if (this.Entries.length == 1)
            return this.GetEntry (0);

        else
        {

            let oldest = this.Sort == SORT_OLDEST_FIRST ? this.GetEntry (0)
                                                        : this.Sort == SORT_NEWEST_FIRST ? this.GetEntry (this.Entries.length - 1)
                                                                                         : null;

            Sys.DEBUG ("Initial set oldest to " + (oldest == null ? oldest.GetTXID () : null ) );

            const debug = Settings.IsDebug ();

            for (const e of this.Entries)
            {
                if (oldest == null || e.GetBlockHeight () < oldest.GetBlockHeight () )
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID + " at block height " + e.GetBlockHeight () + " is older than " 
                                    + (oldest != null ? oldest.GetTXID () + " at " + oldest.GetBlockHeight () : null) );
                    oldest = e;                    
                }
            }
            
            if (oldest == null)
                Sys.ERR ("Could not determine oldest entry out of " + this.Entries?.length + " entries!", GQL.Query);

            else
                Sys.VERBOSE ("Determined that " + oldest.GetTXID () + " at block height " + oldest.GetBlockHeight () + " is the oldest entry.");

            return oldest;
        }
    }          


    GetNewestEntry (owner = null)
    {
        if (this.Entries == null)
        {
            Sys.ERR ("No entries present. Has query been executed?", "Query");
            return null;
        }

        else if (this.Entries.length <= 0)
            return null;

        else if (this.Entries.length == 1)
            return this.GetEntry (0);

        else
        {
            let newest = this.GetOldestEntry ();
            const debug = Settings.IsDebug ();

            for (const e of this.Entries)
            {
                if (owner != null && e.GetOwner () != owner)
                {
                    Sys.WARN (`Found an entry that doesn't match the owner ${owner}
TXID: ${e.GetTXID ()}  at address ${e.GetOwner ()}
${Sys.ANSIRED()}Possible hostile collision attempt from ${e.GetOwner ()}.${Sys.ANSICLEAR()}`);
                    Sys.DEBUG (e);
                }

                else if (newest == null || (e.GetBlockHeight () > newest.GetBlockHeight () ) )
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID + " at block height " + e.GetBlockHeight () + " is newer than " 
                                    + (newest != null ? newest.GetTXID () + " at " + newest.GetBlockHeight () : null) );
                    newest = e;                    
                }
            }
            
            if (newest == null)
                Sys.ERR ("Could not determine oldest entry out of " + this.Entries?.length + " entries!", GQL.Query);

            else
                Sys.VERBOSE ("Determined that " + newest.GetTXID () + " at block height " + newest.GetBlockHeight () + " is the newest entry.");

            return newest;
        }
    }

    GetEntriesForOwner (owner)
    {
        if (owner == null)
        {
            Sys.ERR ("Null parameter given!", "Query.GetEntriesForOwner");
            return [];
        }

        const entries_amount = this.Entries != null ? this.Entries.length : 0;

        const res = [];
        let e;

        if (this.Sort == SORT_OLDEST_FIRST)
        {
            for (let C = 0; C < entries_amount; ++C)
            {
                e = this.GetEntry (C);

                if (e.GetOwner () == owner)
                    res.push (e);
            }
        }

        else if (this.Sort == SORT_NEWEST_FIRST)
        {
            for (let C = entries_amount - 1; C >= 0; --C)
            {
                e = this.GetEntry (C);

                if (e.GetOwner () == owner)
                    res.push (e);
            }
        }
        
        else
            Sys.ERR ("Sort not set for query, cannot reliable sort entries!");

        return res;
    }

    
    GetEntriesByTag (tag, value = null)
    {        
        return this.Entries != null ? Entry.GetEntriesByTag (this.Entries, tag, value) : [];        
    }


    GetTag (index, tag)
    { 
        const  r = this.Edges[index]?.node?.tags?.find (e => e.name == tag);        
        return r != undefined ? r.value : undefined;
    }

    
    _ParseEntries ()
    {
        this.Edges?.forEach (edge => this.Entries.push
        (
            new Entry (edge)            
        ));    
    }

}




class TXQuery extends Query
{

    constructor (arweave, query)
    {
        super (arweave, query);        
    }


    static CreateTxQuery ( config = { cursor: undefined, first: GQL_MAX_RESULTS, owner: undefined, tags: [], sort: SORT_DEFAULT, id:null } )
    {
    
        // No proper query arguments given
        if (config.cursor == undefined && config.owner == undefined && config.tags?.length <= 0)
            Sys.ERR_OVERRIDABLE ("No proper query terms given, would fetch the entire blockchain.", __TAG);


        const cursor_str = config.cursor != undefined ? `after:  "${config.cursor}" ,` : "";                                                      
        const owner_str  = config.owner  != undefined ? `owners: "${config.owner}"  ,` : "";
        const sort_str   = config.sort   != undefined ? `sort:    ${config.sort}    ,` : "";
        const id_str     = config.id     != undefined ? `ids:    "${config.id}"     ,` : "";

        if (config.first == null)
            config.first = GQL_MAX_RESULTS;

        let tag_str = "";
        const tags_amount = config.tags != null ? config.tags.length : 0;
        if (tags_amount > 0)
        {
            tag_str = "tags:[";
            config.tags.forEach ( tag => {tag_str += `{ name:"${tag.name}", values:[${GetGQLValueStr (tag.value)}]},` } ); 
            tag_str += "],";
        }

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
              first:${config.first},
              ${id_str}
              ${block_str}
              ${sort_str}
              ${cursor_str}
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
   async Execute ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT, id: null} )
   {    

       if (config.owner != null && !Util.IsArweaveHash (config.owner) ) // TODO: Add error
            return false;

       let results       = null;
       let cursor        = undefined;       
       let total_entries = 0;
       let pass_edges    = null;
       let pass_entries  = 0;
       let pass_num      = 1;
       let edges         = [];
       let fail          = false;
       
       const desired_amount = config.first != undefined ? config.first : 0;
       const fetch_amount   = config.first != undefined ? config.first : GQL_MAX_RESULTS;

       this.Sort = config.sort;

       Sys.DEBUG ("Starting to fetch transactions..", __TAG);        
       do
       {        
           Sys.DEBUG ("Pass #" + pass_num + " begin:", __TAG);
           
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
               Sys.ERR   ("GQL-query failed.");
               Sys.DEBUG ("RunGLQuery returned null.");
               return false;
           }
           
           pass_edges = results?.data?.data?.transactions?.edges;
           
           if (pass_edges == undefined)
           {
               Sys.ERR ("Something went wrong with the query, at pass #" + pass_num);
               Sys.DEBUG ("Query results:");
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
                    + pass_entries + " transactions received (" + total_entries + " total).", __TAG);       

               ++pass_num;
           }       
           else
           {
               Sys.DEBUG ("Got no entries on pass #" + pass_num);
               break;
           }
                   
       } while ( (pass_entries >= fetch_amount && desired_amount == 0) || total_entries < desired_amount)
       

       // Save the query results
       this.Results       = results;  
       this.Edges         = edges;
       this.EntriesAmount = edges.length;
       this._ParseEntries ();


       Sys.VERBOSE ("Fetched " + this.EntriesAmount + (desired_amount > 0 ? " / " + desired_amount : "") + " transactions.", __TAG)   
       
       
       return !fail && this.EntriesAmount >= desired_amount;
   }

    
}


class Entity
{

    EntityType = null;

    Info =
    {
        "Entity-Type":       null,
        "ArFS-ID":           null,
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
    }

    Entries         = null;    
    FirstEntry      = null;
    NewestEntry     = null;
    NewestMeta      = null;
    MetaByTXID      = {};
    EntryByTXID     = {};
    Query           = null;

    RecursiveFields = ["History", "Versions", "Content", "Orphans", "Parentless", "Errors"];
    StatusFields    = ["Entity-Type", "ArFS-ID", "Name", "Created", "LastModified", "Owner", "DriveID", "DriveStatus", "ParentFolderID", "ParentStatus",
                       "IsOrphaned", "IsEncrypted", "MetaTXID=TXID_Latest", "MetaTXStatus", "MetaTXConfirmations",
                       "DataTXID", "DataTXStatus", "DataTXConfirmations", "Operations", "History", "Versions", "Content"];

    constructor (info = null) 
    { 
        if (info != null) 
            this.Info = info; 
    }


    IsPublic          ()      { return this.Info?.IsPublic    == true;                           }
    IsEncrypted       ()      { return this.Info?.IsEncrypted == true;                           }
    GetInfo           ()      { return this.Info;                                                }
    GetOwner          ()      { return this.Info?.Owner;                                         }
    GetPrivacy        ()      { return this.Info?.Privacy != null ? this.Info.Privacy 
                               : this.Info?.IsEncrypted ? "private" : "public";                  }
    GetName           ()      { return this.Info?.Name;                                          }
    GetLastModified   ()      { return this.Info?.LastModified;                                  }
    GetNewestMetaTXID ()      { return this.Info?.TXID_Latest;                                   }
    GetFirstMetaTXID  ()      { return this.Info?.TXID_Created;                                  }
    AddError          (error) { this.Info.Errors = Util.Append (this.Info.Errors, error, " ");   }    
    GetStatus         ()      { return this.Info?.MetaTXStatus;                                  }
    GetMetaStatusCode ()      { return this.Info?.MetaTXStatusCode;                              }
    GetDataStatusCode ()      { return this.Info?.DataTXStatusCode;                              }


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
    

        if (this.EntityType == ArFSDefs.ENTITYTYPE_DRIVE)
            status_info.Analysis += " File integrity NOT ANALYZED - use the VERIFY-command for that.";

        else if (this.EntityType == ArFSDefs.ENTITYTYPE_FOLDER)
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
            Sys.ERR_ONCE ("PROGRAM ERROR: Entity.GetNewestMetaTXID returned null.");
    }

  

    async UpdateDetailed (arweave, verify = true, content = true)
    {
        if (this.Entries == null)
            return;
        
        if (this.Info == null)
            this.Info = {};


        // (Re)build history
        const history = [];
        const fileversions = {};
        
        let oldstate, newstate = {};
        let msg, str_changes;
        let newest_updated = false;

        for (const e of this.Entries)
        {
            if (e == null)
            {
                Sys.ERR_ONCE ("PROGRAM ERROR: Entity.UpdateHistory: 'e' NULL");
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
            case ArFSDefs.ENTITYTYPE_DRIVE:

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
            
            case ArFSDefs.ENTITYTYPE_FOLDER:
                // Passthrough intentional.

            case ArFSDefs.ENTITYTYPE_FILE:

                // Verify that the drive metadata exists
                if (this.Info?.DriveID != null)
                {
                    const query = new ArFSEntityQuery (arweave);
                    const de = await query.Execute (this.Info.DriveID, ArFSDefs.ENTITYTYPE_DRIVE);

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
                    const pfe = await query.Execute (this.Info.ParentFolderID, ArFSDefs.ENTITYTYPE_FOLDER);
                    
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
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_FILEID),         state, "FileID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_DRIVEID),        state, "DriveID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_FOLDERID),       state, "FolderID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_PARENTFOLDERID), state, "ParentFolderID");
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_CIPHER),         state, "Cipher");
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_CIPHER_IV),      state, "Cipher-IV");
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_DRIVEPRIVACY),   state, "DrivePrivacy");
            state = Util.AssignIfNotNull (tx_entry.GetTag (ArFSDefs.TAG_DRIVEAUTHMODE),  state, "DriveAuthMode");    
                        
            state.IsEncrypted = state.DrivePrivacy == "private" || state.Cipher != null;
            state.IsPublic    = !state.IsEncrypted;

            if (check_txstatus)
            {
                const status = await arweave.GetTXStatusInfo (tx_entry.GetTXID () );
                state.MetaTXStatus        = status?.Status;
                state.MetaTXStatusCode    = status?.StatusCode;
                state.MetaTXConfirmations = status?.Confirmations;
            }
        }
        else
            Sys.ERR_ONCE ("PROGRAM ERROR: tx_entry null.", "Entity.__GetState");

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
        const existing = this.EntryByTXID[txid];
        
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
                        this.EntryByTXID[txid] = tx;
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



class ArFSEntityQuery extends TXQuery
{
   
   /* Override */ async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT} )
   {
       Sys.ERR ("ExecuteReqOwner not applicable to this query type.", this);
       return false;        
   }
   

   async Execute (arfs_id, entity_type)
   {       
        this.Sort = SORT_OLDEST_FIRST;

        const tags = 
        [ 
            Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE,           entity_type),
            Tag.QUERYTAG (ArFSDefs.GetIDTag (entity_type),   arfs_id),                        
        ];
        Tag.APPENDNATIVETAGS (State.Config.ArFSTXQueryTags, tags);
        

        await super.Execute
        (            
            {                                                           
                sort: this.Sort,
                tags: tags,                
            }
        );


        if (this.GetEntriesAmount () > 0)
        {
            const first_entry  = this.GetOldestEntry  ();
            const owner        = first_entry.GetOwner ();
            const newest_entry = this.GetNewestEntry  (owner);

            const entries      = this.GetEntriesForOwner (owner);


            if (first_entry != null)
            {
                const entity = new Entity (
                {        
                    "Entity-Type":       entity_type,
                    "ArFS-ID":           arfs_id,
                    Owner:               owner,
                    Created:             first_entry ?.GetBlockTime () != null ? Util.GetDate (first_entry. GetBlockTime () ) : null,
                    LastModified:        newest_entry?.GetBlockTime () != null ? Util.GetDate (newest_entry.GetBlockTime () ) : null,
                    TXID_Created:        first_entry ?.GetTXID        (),
                    TXID_Latest:         newest_entry?.GetTXID        (),
                    Block_Created:       first_entry ?.GetBlockID     (),
                    Block_Latest:        newest_entry?.GetBlockID     (),
                    BlockHeight_Created: first_entry ?.GetBlockHeight (),
                    BlockHeight_Latest:  newest_entry?.GetBlockHeight (),                    
                    Operations:          entries?.length,
                    IsEncrypted:         first_entry?.HasTag (ArFSDefs.TAG_CIPHER),
                });

                entity.EntityType  = entity_type;
                entity.FirstEntry  = first_entry;
                entity.NewestEntry = newest_entry;
                entity.Entries     = entries;
                entity.Query       = this;


                if (entity.Operations <= 0)
                    Sys.ERR ("Something went wrong - couldn't get entries matching owner " + owner);


                if (entity.Entries != null)
                {
                    for (const e of entity.Entries)
                    {
                        entity.EntryByTXID[e.GetTXID ()] = e;
                    }
                }
                else
                    Sys.ERR ("Entries null.", "ArFSEntityQuery");

    
     
                // Don't update the metadata yet.
                // This query can be used to retrieve things like owner,
                // where it's not necessary to have.                
                entity.UpdateBasic (this.Arweave, true, false, false);
              


                if (Settings.IsDebug () )
                {
                    Sys.DEBUG ("Fetched ArFS-entity " + arfs_id + " :");
                    Sys.DEBUG (entity);
                }
                
                if (Settings.IsVerbose () )
                {
                    Sys.VERBOSE ("Fetched ArFS-entity - Owner:"  + entity.GetOwner () 
                                 + " Privacy:"                   + entity.GetPrivacy (), 
                                 + " TXID:"                      + entity.GetNewestMetaTXID (), 
                                 arfs_id);
                }
                            
                return entity;
            }
            else
                Sys.ERR ("Program error at GQL.DriveEntityQuery.");
                
            return null;
        }

        else
        {
            Sys.VERBOSE ("Failed to retrieve " + entity_type + "-entity for ID '" + arfs_id + "'.");
            return null;
        }
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
            Tag.APPENDNATIVETAGS (State.Config.ArFSTXQueryTags, tags);

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
            Tag.APPENDNATIVETAGS (State.Config.ArFSTXQueryTags, tags);

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
            return Sys.ERR ("PROGRAM ERROR: drive_id null", "ArFSDriveContentQuery");

        if (owner == null)
            return Sys.ERR ("PROGRAM ERROR: owner null", "ArFSDriveContentQuery");



        const tags = 
        [ 
            Tag.QUERYTAG (ArFSDefs.TAG_ENTITYTYPE,    ArFSDefs.ENTITYTYPES_INFOLDER),
            Tag.QUERYTAG (ArFSDefs.TAG_DRIVEID,       drive_id),
        ];
        Tag.APPENDNATIVETAGS (State.Config.ArFSTXQueryTags, tags);
        

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
    const arweave = Arweave.Init ();

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






module.exports = { RunGQLQuery, IsValidSort: IsSortValid,
                   Query, TXQuery, ArFSEntityQuery, LatestQuery, Entry, Tag, ByTXQuery, ArFSDriveContentQuery, ArFSDriveQuery,
                   SORT_DEFAULT, SORT_HEIGHT_ASCENDING, SORT_HEIGHT_DESCENDING, SORT_OLDEST_FIRST, SORT_NEWEST_FIRST }