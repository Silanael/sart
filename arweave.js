//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// arweave.js - 2021-10-17_01
// Code to interact with Arweave.
//


// Imports
const ArweaveLib  = require ('arweave');
const Sys         = require ('./sys.js');
const Settings    = require ('./settings.js');
const Util        = require ('./util.js');



// Constants
const GQL_MAX_RESULTS = 100;


// Variables
var Arweave_Instance;


function Init ()
{
    if (Arweave_Instance == undefined)
    {
        const Config = Settings.Config;
        Sys.VERBOSE ("Connecting to " + Settings.GetHostString () + "...")

        Arweave_Instance = ArweaveLib.init
        (
            {
                host:     Config.ArweaveHost,
                port:     Config.ArweavePort,
                protocol: Config.ArweaveProto
            }
        );        
    }
    return Arweave_Instance;
}

async function Testing ()
{
    const arweave = ArweaveLib.init
    (
        {
            host:     Settings.Config.ArweaveHost,
            port:     Settings.Config.ArweavePort,
            protocol: Settings.Config.ArweaveProto
        }
    );     
    
}


async function DisplayArweaveInfo (args)
{
    const arweave = Init ();

    Sys.VERBOSE ("Fetching network information..");
    Sys.OUT_TXT (await arweave.network.getInfo () );

}



// Returns raw results.
async function RunGQLQuery (query_str)
{    
    const arweave = Init ();
    const results = await arweave.api.post (Settings.GetGQLHostString (), { query: query_str } );
    return results;
}



// Does a transaction () query, returns edges.
async function RunGQLTransactionQuery (owner = undefined, tags = [], sort = 'HEIGHT_DESC')
{    
    const arweave   = Init ();
    
    let cursor = undefined;
    let results;
    let query_str;
    let pass_edges;
    let pass_entries = 0;
    let pass_num = 1;
    
    let edges = [];

    Sys.VERBOSE ("Starting to fetch transactions..");

    do
    {
        Sys.DEBUG ("Pass #" + pass_num + " begin:");
        
        query_str = CreateGQLTransactionQuery ( { "cursor": cursor, "first": GQL_MAX_RESULTS, "owner":owner, "tags":tags, "sort":sort } );
        
        Sys.DEBUG ("Query:")
        Sys.DEBUG (query_str);
        
        results        = await RunGQLQuery (query_str);
        pass_edges     = results.data.data.transactions.edges;
        pass_entries   = pass_edges.length;

        if (pass_entries > 0)
        {
            cursor = pass_edges.at(-1).cursor;
            edges  = edges.concat (pass_edges)

            Sys.VERBOSE ("Pass #" + pass_num + ": " + pass_entries + " entries.");

            ++pass_num;
        }

        else
            break;
                
    } while (pass_entries >= GQL_MAX_RESULTS)
    

    Sys.VERBOSE ("Total entries: " + edges.length)

    return edges;
}



function CreateGQLTransactionQuery ( config = { cursor: undefined, first: GQL_MAX_RESULTS, owner: undefined, tags: [], sort: 'HEIGHT_DESC'} )
{
    
    // No proper query arguments given
    if ( !Settings.IsForceful () && config.cursor == undefined && config.owner == undefined && config.tags.length <= 0)    
        Sys.ERR_FATAL ("No proper query terms given, would fetch the entire blockchain. Aborting.");
    

    const cursor_str = config.cursor != undefined ? `after:  "${config.cursor}" ,` : "";                                                      
    const owner_str  = config.owner  != undefined ? `owners: "${config.owner}"  ,` : "";
        
    
    let tag_str = "";
    if (config.tags.length > 0)
    {
        tag_str = "tags:[";
        config.tags.forEach ( tag => {tag_str += `{ name:"${tag.name}", values:"${tag.values}"},` } ); 
        tag_str += "],";
    }

    const query = 
    `
    query 
    {
        transactions
        (             
          first:${config.first},
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
              block {id}            
            }
          }
        }
      }
   `;

   return query;
}



async function SearchTag (tag, value)
{
    const arweave = Init ();

    Sys.VERBOSE ("Searching for tag:'" + tag + "'='" + value + "':");
    const files = await arweave.transactions.search (tag, value);    
}



async function GetTx (txid)
{    
    const arweave = Init ();
    tx = await arweave.transactions.get (txid);    
    return tx;
}



async function OutputTxData (txid)
{
    
     const arweave = await Init ();
     arweave.transactions.getData (txid, {decode: true} )                
             .then ( data => { process.stdout.write (data) } );

}

async function GetTxData (txid)
{
    
     const arweave = await Init ();     
     const data = await arweave.transactions.getData (txid, {decode: true} );
     return data;
}

async function GetTxStrData (txid)
{
    
     const arweave = await Init ();
     const data = await arweave.transactions.getData (txid, {decode: true, string: true} );
     return data;
}


async function GetTXsForAddress (address, tags = [] )
{
    const arweave = Init ();
    results = await RunGQLTransactionQuery (address, tags)     
    return results;
}



module.exports = { Init, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, 
                   OutputTxData, GetTXsForAddress, Testing };  // TODO: Remove testing!