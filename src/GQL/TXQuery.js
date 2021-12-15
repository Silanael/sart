//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// GQL_TXQuery.js - 2021-10-30_01
// A query for multiple transactions matching criteria.
//

const Constants    = require ("../CONSTANTS");
const { SETTINGS } = require ("../SETTINGS");
const State        = require ("../ProgramState");
const Sys          = require ("../System");
const Util         = require ("../Util");
const Query        = require ("./GQLQuery");



class TXQuery extends Query
{

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
    }
    

    static CreateTxQuery ( config = { cursor: null, first: GQL_MAX_RESULTS, owner: null, tags: [], sort: SORT_DEFAULT, id: null } )
    {
    
        // No proper query arguments given
        if (config.cursor == undefined && config.owner == undefined && config.tags?.length <= 0)
            Sys.ERR_OVERRIDABLE ("No proper query terms given, would fetch the entire blockchain.", __TAG);


        const cursor_str = config.cursor != null ? `after:  "${config.cursor}" ,` : "";
        const first_str  = config.first  != null ? `first:   ${config.first}   ,` : "";        
        const owner_str  = config.owner  != null ? `owners: "${config.owner}"  ,` : "";
        const sort_str   = config.sort   != null ? `sort:    ${config.sort}    ,` : "";
        const id_str     = config.id     != null ? `ids:    "${config.id}"     ,` : "";
        const tag_str    = config.tags   != null ?  config.tags.ToGQL () +    "," : "";


        let block_str = "";
        const minblock = State.GetSetting (SETTINGS.QueryMinBlockHeight);
        const maxblock = State.GetSetting (SETTINGS.QueryMaxBlockHeight);

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
   async ExecuteReqOwner ( config = { cursor: null, first: null, owner: null, tags: null, sort: SORT_DEFAULT, id: null} )
   {
        if (config?.owner != null)
        {
            const ret = await this.Execute (config);
            return ret;
        }
        else
            return Sys.ERR_PROGRAM ("ExecuteReqOwner: Owner not provided.", this);
   }

  

   /* Returns true if desired amount of entries was gotten, false if not */
   async Execute ( config = { cursor: null, first: null, owner: null, tags: null, sort: Constants.GQL_SORT_DEFAULT, id: null} )
   {    

        if (config.sort == null)
        {
            config.sort = Constants.GQL_SORT_DEFAULT;
            Sys.WARN ("Sort not set, using default ´" + config.sort + "`.", "TXQuery.Execute", { error_id: Constants.ERROR_IDS.SORT_NOT_SET } )
        }
        
        this.SetSort (config.sort);
        this.Results       = null;
        this.Edges         = null;
        

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
                   cursor : cursor, 
                   first  : fetch_amount, 
                   owner  : config.owner, 
                   tags   : config.tags, 
                   sort   : config.sort,
                   id     : config.id
               } 
           );                         
           
           results = await Query.POST_GQL_QUERY (this.Arweave, q_str);
           
           if (results == null)
           {
               Sys.ERR   ("GQL-query failed.", "TXQuery.Execute");
               Sys.DEBUG ("RunGLQuery returned null.", "TXQuery.Execute");
               return false;
           }
           
           pass_edges = results?.data?.data?.transactions?.edges;
           
           if (pass_edges == undefined)
           {               
               const errors = Util.ObjToStr (results?.data?.errors);
               Sys.ERR ("Query failed at pass #" + pass_num + ": Status code " + results.status + " (" 
                         + (results.statusText != null ? results.statusText : "no statusText set") + ")."
                         + (errors != null ? " Errors: " + errors : "")
                         );
                         
               if (results.status == 403)
                    Sys.ERR ("Too many queries or the gateway/node (host " + State.CurrentHost + ") acting up.");

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
       

       Sys.VERBOSE ("Fetched " + (this.Edges != null ? this.Edges.length : "no") 
                     + (desired_amount > 0 ? " / " + desired_amount : "") + " transactions.", "TXQuery.Execute")   
       
       
       return !fail && this.EntriesAmount >= desired_amount;
   }

}



module.exports = TXQuery;
