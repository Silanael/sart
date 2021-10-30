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
const { debug } = require('arweave/node/lib/merkle');



// Variables
var Arweave_Instance;



// Constants
const ENDPOINT_PENDING = "tx/pending";
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


async function OwnerToAddress (owner)
{
    const arweave = Init ();
    return await arweave.wallets.ownerToAddress (owner);
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

async function GetMemPool ()
{
    const arweave = Init ();
    try
    {
        const ret = await arweave.api.get (ENDPOINT_PENDING);
        if (ret.data != null)
            return ret.data;
    }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetmemPool ()"); }

    return null;
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
    
    try               { tx = await arweave.transactions.get (txid);                               }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTx (" + txid + ")"); tx = null;  }

    return tx;
}



async function OutputTxData (txid)
{    
     const arweave = await Init ();

     try
     {
        arweave.transactions.getData (txid, {decode: true} )                
                 .then ( data => { process.stdout.write (data) } );
     }
     catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.OutputTxData (" + txid + ")"); tx = null;  }
}





async function GetTxData (txid)
{ 
    const arweave = await Init ();     

    try               
    { 
         const data = await arweave.transactions.getData (txid, {decode: true} );  
    }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTxData (" + txid + ")"); tx = null;  }

    return data;
}




async function GetTxStrData (txid)
{    
    const arweave = await Init ();

    try
    { 
        const data = await arweave.transactions.getData (txid, {decode: true, string: true} );  
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTxStrData (" + txid + ")"); }
 
    return data;
}




async function GetTxRawData (txid)
{    
    const arweave = await Init ();

    try
    { 
        const data = await arweave.chunks.downloadChunkedData (txid); 
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTxRawData (" + txid + ")"); }
    
    return data;
}




async function GetTXsForAddress (address, tags = [] )
{
    const query = GQL.Query ()
    const arweave = Init ();

    try
    { 
        const results = await GQL.RunGQLTransactionQuery (this, address, tags)     
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTXsForAddress (" + address + ", " + tags + ")"); }    
    
    return results;
}



module.exports = { Init, Post, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, GetTxRawData, 
                   OutputTxData, GetTXsForAddress, GetNetworkInfo, PrintNetworkInfo, OwnerToAddress, GetMemPool };