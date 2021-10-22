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

const __TAG                  = "GQL";




// My first class written in JavaScript. Yay.
// I've been holding back with them a bit,
// enjoying the oldschool C-type programming
// while it lasted.
class Query
{
    Arweave = null;

    // How does one make these things protected?
    constructor (arweave)
    {
        if (arweave == null)
            Sys.ERR_FATAL ("Query: Missing parameter 'Arweave'.", "GQL");

        this.Arweave       = arweave;
            
        this.Edges         = null;
        this.EntriesAmount = 0;
    }

    async ExecuteOnce (query)
    {
        if (query != null)
            this.Query = query;
 
        Sys.DEBUG (Query);
 
        const arweave = this.Arweave.Init ();                
        this.Results = await RunGQLQuery (Arweave, this.Query)
        
        this.Edges = this.Results.data.data.transactions.edges;
        this.EntriesAmount = this.Edges.length;
    }
 
    
    GetTXID          (index)      { return this.Edges[index]?.node?.id;                                           }
    GetAddress       (index)      { return this.Edges[index]?.node?.owner?.address;                               }
    GetBlockHeight   (index)      { return this.Edges[index]?.node?.block?.height;                                }
    GetTags          (index)      { return this.Edges[index]?.node?.tags;                                         }    
    HasTag           (index, tag) { return this.GetTag (index, tag) != undefined;                                 }
    GetEdge          (index)      { return this.GetEdges()[index];                                                }
    GetEdges         ()           { return this.Edges                                                             }
    GetEntriesAmount ()           { return this.EntriesAmount;                                                    }
    

    GetTag (index, tag)
    { 
        const  r = this.Edges[index]?.node?.tags?.find (e => e.name == tag);        
        return r != undefined ? r.value : undefined;
    }
}



class TXQuery extends Query
{
    constructor (arweave, query)
    {
        super (arweave, query);        
    }

    static CreateTxQuery ( config = { cursor: undefined, first: GQL_MAX_RESULTS, owner: undefined, tags: [], sort: SORT_DEFAULT} )
    {
    
        // No proper query arguments given
        if (config.cursor == undefined && config.owner == undefined && config.tags.length <= 0)
            Sys.ERR_OVERRIDABLE ("No proper query terms given, would fetch the entire blockchain.", __TAG);


        const cursor_str = config.cursor != undefined ? `after:  "${config.cursor}" ,` : "";                                                      
        const owner_str  = config.owner  != undefined ? `owners: "${config.owner}"  ,` : "";
        
        let tag_str = "";
        if (config.tags.length > 0)
        {
            tag_str = "tags:[";
            config.tags.forEach ( tag => {tag_str += `{ name:"${tag.name}", values:"${tag.values}"},` } ); 
            tag_str += "],";
        }

        return `
        query 
        {
            transactions
            (             
              first:${config.first},
              sort:${config.sort},
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
                  owner {address},
                  block {id,height},
                  tags  {name, value}            
                }
              }
            }
        }
        `;
   }

   

   /* Returns true if desired amount of entries was gotten, false if not. Owner must be specified. */
   async ExecuteReqOwner ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT} )
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
   async Execute ( config = { cursor: undefined, first: undefined, owner: undefined, tags: [], sort: SORT_DEFAULT} )
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
       
       const desired_amount = config.first != undefined ? config.first : 0;
       const fetch_amount   = config.first != undefined ? config.first : GQL_MAX_RESULTS;
       

       Sys.VERBOSE ("Starting to fetch transactions..", __TAG);        
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
           
           results    = await RunGQLQuery (this.Arweave, q_str);                 
           pass_edges = results.data?.data?.transactions?.edges;
           
           if (pass_edges == undefined)
           {
               Sys.ERR ("Something went wrong with a query.");
               Sys.DEBUG (results);
               process.exit ();
               break;
           }

           pass_entries   = pass_edges.length;
           total_entries += pass_entries;     

           if (pass_entries > 0)
           {
               cursor = pass_edges.at(-1).cursor;
               edges  = edges.concat (pass_edges)      
               Sys.VERBOSE ("Pass #" + pass_num + ": " + pass_entries + " entries.", __TAG);       
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


       Sys.VERBOSE ("Total entries: " + this.EntriesAmount + (desired_amount > 0 ? " / " + desired_amount : ""), __TAG)       
       
       return this.EntriesAmount >= desired_amount;
   }

    
}








// Returns raw results.
async function RunGQLQuery (Arweave, query_str)
{            
    const arweave = Arweave.Init ();

    Sys.DEBUG ("Running query:");
    Sys.DEBUG (query_str);

    const results = await arweave.api.post (Settings.GetGQLHostString (), { query: query_str } );

    return results;
}








module.exports = { RunGQLQuery, 
                   Query, TXQuery,
                   SORT_DEFAULT, SORT_HEIGHT_ASCENDING, SORT_HEIGHT_DESCENDING, SORT_OLDEST_FIRST, SORT_NEWEST_FIRST }