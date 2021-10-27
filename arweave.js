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
const GQL         = require ('./GQL.js');



// Variables
var Arweave_Instance;



// Constants
const _TAG = "Arweave";






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


// HTTP POST request. Currently using 
async function Post (host_str, data_obj)
{
    if (data_obj != null)
    {
        const arweave = Init ();

        try
        {
            const ret = await arweave.api.post (host_str, data_obj );
            return ret;
        }
        catch (exception)
        {
            Sys.DEBUG ("Exception at arweave.js Post () - Exception:");
            Sys.DEBUG (exception);
            Sys.DEBUG ("Exception at arweave.js Post () - Input obj:");
            Sys.DEBUG (data_obj);
            Sys.ERR_FATAL ("HTTP POST to " + host_str + " failed!");
        }        
    }
    return null;
}



async function DisplayArweaveInfo (args)
{
    const arweave = Init ();

    Sys.VERBOSE ("Fetching network information..");
    Sys.OUT_TXT (await arweave.network.getInfo () );

}


async function GetNetworkInfo   ()
{ 
    const arweave = Init (); 
    const r = await arweave.network.getInfo (); 
    return r; 
}


function PrintNetworkInfo () { Sys.OUT_TXT (GetNetworkInfo); }



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


async function GetTxRawData (txid)
{    
    const arweave = await Init ();
    const data = await arweave.chunks.downloadChunkedData (txid); 
    return data;
}


async function GetTXsForAddress (address, tags = [] )
{
    const query = GQL.Query ()
    const arweave = Init ();
    results = await GQL.RunGQLTransactionQuery (this, address, tags)     
    return results;
}



module.exports = { Init, Post, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, GetTxRawData, 
                   OutputTxData, GetTXsForAddress, GetNetworkInfo, PrintNetworkInfo};