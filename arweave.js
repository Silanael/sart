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
async function RunGQLTransactionQuery (tags = [], sort = 'HEIGHT_DESC')
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
        
        query_str = CreateGQLTransactionQuery ( { "cursor": cursor, "first": GQL_MAX_RESULTS, "tags":[], sort:'HEIGHT_DESC'} );
        
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



function CreateGQLTransactionQuery ( config = { cursor: undefined, first: GQL_MAX_RESULTS, tags: [], sort: 'HEIGHT_DESC'} )
{
    const cursor_str = config.cursor != undefined ? `after: "${config.cursor}",` 
                                                  : "";
    
    const query = 
    `
    query 
    {
        transactions
        ( 
          first:${config.first},
          ${cursor_str}
          tags:
          [
            { name:"Drive-Id", values:"a44482fd-592e-45fa-a08a-e526c31b87f1"},
            { name:"Entity-Type", values:"file"},            
          ]
          
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



async function GetTxData (args)
{
    // No transaction ID given
    if (args.length <= 0)
        Sys.ERR_MISSING_ARG ();

    else
    {
        const tx_id   = args[0];
        const arweave = await Init ();

        arweave.transactions.getData (tx_id, {decode: true} )                
                .then ( data => { process.stdout.write (data) } );

    }
}


async function GetTXsForAddress (address)
{
    const arweave = Init ();
    results = await RunGQLTransactionQuery ()     
    return results;
}



module.exports = { Init, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTXsForAddress, Testing };  // TODO: Remove testing!