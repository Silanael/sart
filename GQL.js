//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// GQL.js - 2021-10-19_01
// Code to create and run GraphQL-queries
//

// Imports
const Settings = require ('./settings.js');
const Sys      = require ('./sys.js');
const Util     = require ('./util.js');




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
}




class Entry
{
    TXID           = null;
    Owner          = null;
    BlockHeight    = null;
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


    GetTXID        ()    { return this.TXID;                                                     }
    GetOwner       ()    { return this.Owner;                                                    }
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

  

    GetTag (tag)
    { 
        const r = this.Tags.find (e => e.name == tag);
        return r != null ? r.value : null;
    }

    WithTag (name, value)
    {
        if (this.Tags == null) 
            this.Tags = [];

        this.Tags.push (new Tag (name, value) );
        
        return this; 
    }

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

        return `
        query 
        {
            transactions
            (             
              first:${config.first},
              ${id_str}
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


class DriveEntityQuery extends TXQuery
{
   
   /* Override */ async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT} )
   {
       Sys.ERR ("ExecuteReqOwner not applicable to this query type.", this);
       return false;        
   }
   

   /** Retrieve drive's owner address. */
   async Execute (drive_id)
   {       
        this.Sort = SORT_OLDEST_FIRST;

        await super.ExecuteOnce
        (
            TXQuery.CreateTxQuery 
            ({                                                           
                    sort: this.Sort,
                    tags:   
                    [ 
                        Tag.QUERYTAG ("Entity-Type",  "drive"),
                        Tag.QUERYTAG ("Drive-Id",     drive_id),                        
                    ],                     
                    
            })
        );

        if (this.GetEntriesAmount () > 0)
        {
            const first_entry  = this.GetOldestEntry  ();
            const owner        = first_entry.GetOwner ();
            const newest_entry = this.GetNewestEntry  (owner);

            if (first_entry != null)
            {
                const entity = 
                {                                        
                    Privacy:    first_entry.GetTag   ("Drive-Privacy"),
                    Drive_ID:   first_entry.GetTag   ("Drive-Id"),
                    Owner:      owner,                    
                }

                const entries = this.GetEntriesForOwner (owner);

                entity.IsPublic = entity.Privacy == "public";

                entity.Operations   = entries != null ? entries.length : -1;
                entity.TXID_Created = first_entry?.GetTXID  ();
                entity.TXID_Latest  = newest_entry?.GetTXID ();

                entity.FirstEntry  = first_entry;
                entity.NewestEntry = newest_entry;
                entity.Entries     = entries;
                entity.Query       = this;

                if (entity.Operations <= 0)
                    Sys.ERR ("Something went wrong - couldn't get entries matching owner " + owner);


                if (Settings.IsDebug () )
                {
                    Sys.DEBUG ("Fetched drive entity for Drive-ID: " + drive_id + " :");
                    Sys.DEBUG (entity);
                }
                
                if (Settings.IsVerbose () )
                {
                    Sys.VERBOSE ("Fetched drive entity. Owner:"  + entity.owner 
                                 + " Privacy:"                   + entity.Privacy, 
                                 + " TXID:"                      + entity.TXID, 
                                 drive_id);
                }
                
                

                return entity;
            }
            else
                Sys.ERR ("Program error at GQL.DriveEntityQuery.");
                
            return null;
        }

        else
        {
            Sys.ERR ("Failed to retrieve owner for Drive-ID: " + drive_id);
            return null;
        }
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
                   Query, TXQuery, DriveEntityQuery, LatestQuery, Entry, Tag, ByTXQuery,
                   SORT_DEFAULT, SORT_HEIGHT_ASCENDING, SORT_HEIGHT_DESCENDING, SORT_OLDEST_FIRST, SORT_NEWEST_FIRST }