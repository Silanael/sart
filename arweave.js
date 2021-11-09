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
const Tag         = GQL.Tag;



// Variables
var Arweave_Instance;



// Constants
const TXSTATUS_OK       = 200;
const TXSTATUS_PENDING  = 202;
const TXSTATUS_NOTFOUND = 404;

const ENDPOINT_PENDING = "tx/pending";
const _TAG = "Arweave";







function Init ()
{
    if (Arweave_Instance == undefined)
    {
        const Config = Settings.Config;
        Sys.INFO ("Connecting to " + Settings.GetHostString () + "...")

        Arweave_Instance = ArweaveLib.init
        (
            {
                host:     Config.ArweaveHost,
                port:     Config.ArweavePort,
                protocol: Config.ArweaveProto,
                timeout:  100000
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


function WinstonToAR (winston_amount)
{
    const arweave = Init ();
    return arweave.ar.winstonToAr (winston_amount);
}
function QuantityToAR (quantity) { return WinstonToAR (quantity); }


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


async function GetPendingTXAmount ()
{
    const  mempool = await GetMemPool ();
    return mempool?.length;
}




function PrintNetworkInfo () { Sys.OUT_TXT (GetNetworkInfo); }



async function SearchTag (tag, value)
{
    const arweave = Init ();

    Sys.VERBOSE ("Searching for tag:'" + tag + "'='" + value + "':");
    const files = await arweave.transactions.search (tag, value);    
}


// TODO: Separate this try-catch -stuff into a common function.
async function GetTx (txid)
{    
    const arweave = Init ();    
    let   tx      = null;

    try               { tx = await arweave.transactions.get (txid);                               }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTx (" + txid + ")"); tx = null;  }

    return tx;
}


async function GetLatestTxWithTags (tags, address = null, opts = { ret_if_notfound: null } )
{
    if (tags?.length > 0)
    {
        const query = new GQL.LatestQuery (this);
        const entry = await query.Execute (tags, address);
        return entry != null ? entry : opts?.ret_if_notfound;
    }
    return opts?.ret_if_notfound;
}



async function GetTXStatus (txid)
{
    const arweave  = Init ();    
    let   txstatus = null;

    try               { txstatus = await arweave.transactions.getStatus (txid);                         }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTXStatus (" + txid + ")"); tx = null;  }

    return txstatus;
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
    let   data    = null;

    try               
    { 
         data = await arweave.transactions.getData (txid, {decode: true} );  
    }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTxData (" + txid + ")"); tx = null;  }

    return data;
}




async function GetTxStrData (txid)
{    
    const arweave = await Init ();
    let   data    = null;

    try
    { 
        data = await arweave.transactions.getData (txid, {decode: true, string: true} );  
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTxStrData (" + txid + ")"); }
 
    return data;
}




async function GetTxRawData (txid)
{    
    const arweave = await Init ();
    let   data    = null;

    try
    { 
        data = await arweave.chunks.downloadChunkedData (txid); 
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTxRawData (" + txid + ")"); }
    
    return data;
}



async function GetTXs ( args = {address: null, tags: null, first: null, sort: null, cursor: null } )
{    
    const query   = new GQL.TXQuery (this);
    
    try
    { 
        const success = await query.ExecuteReqOwner (args);
        if (success)
            return query;
        else
        {
            Sys.ERR ("Failed to get transactions for address " + address + " .");
            return null;
        }
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTXsForAddress (" + address + ", " + tags + ")"); }    
    
    return null;
}


async function GetTXsForAddress (address, tags = null)
{
    return await GetTXs ({address: address, tags: tags} );    
}



module.exports = { Init, Post, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, GetTxRawData, 
                   OutputTxData, GetTXsForAddress, GetNetworkInfo, PrintNetworkInfo, OwnerToAddress, GetMemPool, GetPendingTXAmount,
                   GetTXStatus, GetTXs, WinstonToAR, QuantityToAR, GetLatestTxWithTags, Tag,
                   TXSTATUS_OK, TXSTATUS_NOTFOUND, TXSTATUS_PENDING };