//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// GQL.js - 2021-10-19_01
// Code to create and run GraphQL-queries
//

// Imports
const Constants   = require ("./CONST_SART.js");
const State       = require ("./ProgramState.js");
const Settings    = require ('./Settings.js');
const Sys         = require ('./System.js');
const Util        = require ('./Util.js');
const ArFSDefs    = require ('./CONST_ARFS.js');













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


    async ExecuteOnce (query)
    {
        if (query != null)
            this.Query = query;
 
        Sys.DEBUG (query);
 
        const arweave = await this.Arweave.Connect ();
        if (arweave != null)
        {
            this.Results  = await RunGQLQuery (this.Arweave, this.Query)
                     
            this.Edges         = this.Results?.data?.data?.transactions?.edges;
            this.EntriesAmount = this.Edges != null ? this.Edges.length : 0;
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
    GetEdges         ()           { return this.Edges;                                     }
    GetSort          ()           { return this.Sort;                                      }
    

}

















// Returns raw results.
async function RunGQLQuery (Arweave, query_str)
{            
    const arweave = await Arweave.Connect ();

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






module.exports = Query;