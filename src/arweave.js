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

const Constants = require ("./CONST_SART.js");
const State     = require ("./ProgramState.js");
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
const _TAG             = "Arweave";

const CONNSTATES =
{
    NOTCONN : "NOT CONNECTED",
    OK      : "OK",
    FAIL    : "FAILED",
}

let ConnectionState = CONNSTATES.NOTCONN;



async function Connect (args)
{    
    const hoststr = args.Pop ();

    if (hoststr != null)
        Settings.SetHost (hoststr);

    Arweave_Instance = null;

    return await Init () != null;
}



async function Init (nofail = false)
{
    if (Arweave_Instance == null)
    {
        const Config = State.Config;
        Sys.VERBOSE ("Settings connection params to " + Settings.GetHostString () + " .")

        Arweave_Instance = ArweaveLib.init
        (
            {
                host:     Config.ArweaveHost,
                port:     Config.ArweavePort,
                protocol: Config.ArweaveProto,
                timeout:  Config.ArweaveTimeout_ms,
            }
        );    
        // Test the connection.
        if (await TestConnection () )
        {
            Sys.INFO ("Connected to " + GetHostStr (Arweave_Instance) + " (" + Config.ArweaveTimeout_ms + "ms timeout)" );
            return Arweave_Instance;
        }

        return nofail == true ? Arweave_Instance : null;    
    }

    return Arweave_Instance;
}



async function TestConnection ()
{
    if (Arweave_Instance != null)
    {
        const info = await GetNetworkInfo ();
        
        if (info != null)
        {            
            ConnectionState = CONNSTATES.OK;
            return { State: ConnectionState, NetworkInfo: info };
        }
        else
            ConnectionState = CONNSTATES.FAIL;
    }
    else
        ConnectionState = CONNSTATES.NOTCONN;

    return { State: ConnectionState, NetworkInfo: null }
}



async function GetTargetHost ()
{
    return Arweave_Instance != null ? GetHostStr (Arweave_Instance) : Settings.GetHostString ();
}



function GetHostStr (arweave)
{
    if (arweave != null)
    {
        try
        {
            const conf = arweave.api.getConfig ();
            return conf.protocol + "://" + conf.host + ":" + conf.port;
        }
        catch (exception) { Sys.ON_EXCEPTION (exception); }
    }
    else return "HOST NOT SET";

    return null;    
}


async function GetConnectionStatus ()
{ 
    const ret = await TestConnection ();
    return ret;
}

function IsConfirmationAmountSafe (confirmations)
{
    return confirmations != null && Number (confirmations) >= State.Config.SafeConfirmationsMin;
}



async function Testing ()
{
    const arweave = ArweaveLib.init
    (
        {
            host:     State.Config.ArweaveHost,
            port:     State.Config.ArweavePort,
            protocol: State.Config.ArweaveProto
        }
    );  
}



// HTTP POST request. Currently using 
async function Post (host_str, data_obj)
{
    const arweave = await Init ();

    if (arweave != null && data_obj != null)
    {        
        try
        {
            const ret = await arweave.api.post (host_str, data_obj );
            return ret;
        }
        catch (exception) 
        {
            Sys.ON_EXCEPTION (exception, "Arweave.Post", host_str);            
        }        
    }
    return null;
}


async function OwnerToAddress (owner)
{
    const arweave = await Init ();
    return arweave != null ? await arweave.wallets.ownerToAddress (owner) : null;
}


function WinstonToAR (winston_amount)
{
    // TODO: Make more reasonable.
    const arweave  = Arweave_Instance != null ? Arweave_Instance : ArweaveLib.init ();
    return arweave != null ? arweave.ar.winstonToAr (winston_amount) : null;
}

function QuantityToAR (quantity) { return WinstonToAR (quantity); }



async function DisplayArweaveInfo ()
{
    const ret = await GetnetworkInfo ();
    
    if (ret != null)
        Sys.OUT_TXT (ret);    
}


async function GetNetworkInfo ()
{ 
    const arweave = await Init ();

    if (arweave != null)
    {
        try 
        {
            const r = await arweave.network.getInfo ();
                        
            if (typeof r === 'string')
            {
                Sys.ERR ("Host " + GetHostStr (arweave) + " doesn't seem to be a valid gateway/node. Call with --force to use anyway.");
                return Settings.IsForceful () ? r : null;
            }
            else
                return r;                         
        }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetNetworkInfo", GetHostStr (arweave) ); }
    }
    return null;
}


async function GetMemPool ()
{
    const arweave = await Init ();
    if (arweave != null)
    {
        try
        {
            const ret = await arweave.api.get (ENDPOINT_PENDING);
            if (ret.data != null)
                return ret.data;
        }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetmemPool", GetHostStr (arweave) ); }
    }

    return null;
}

async function GetPeers ()
{
    const arweave = await Init ();
    if (arweave != null)
    {
        try
        {
            const ret = await arweave.network.getPeers ();
            return ret;            
        }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetPeers", GetHostStr (arweave) ); }
    }

    return null;
}



async function GetPendingTXAmount ()
{
    const  mempool = await GetMemPool ();
    return mempool?.length;
}




function PrintNetworkInfo () { Sys.OUT_TXT (GetNetworkInfo); }


// Don't use.
async function SearchTag (tag, value)
{
    const arweave = await Init ();

    Sys.VERBOSE ("Searching for tag:'" + tag + "'='" + value + "':");
    const files = await arweave.transactions.search (tag, value);    
}


// TODO: Separate this try-catch -stuff into a common function.
async function GetTx (txid)
{    
    const arweave = await Init ();    
    
    if (arweave != null)
    {
        try               { let tx = await arweave.transactions.get (txid); return tx; }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTx (" + txid + ")"); tx = null;  }
    }

    return null;
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
    const arweave  = await Init ();    
    
    try               
    { 
        let txstatus = await arweave.transactions.getStatus (txid);
        
        // Currently (2021-11-18), the gateway doesn't return TX-status for transactions
        // that are contained inside bundles, yet a GQL-query is able to fetch them.
        if (txstatus != null && txstatus.status == TXSTATUS_NOTFOUND)
        {
            Sys.DEBUG ("arweave.transactions.getStatus returned 404, trying with a GQL-query..", txid);
            
            const query = new GQL.ByTXQuery (this);
            const res = await query.Execute (txid);

            if (res != null)
            {
                if (res.IsMined () )
                    return { status: TXSTATUS_OK, confirmed: {} };
                else 
                    return { status: TXSTATUS_PENDING, confirmed: null };
            }
            else
                return { status: TXSTATUS_NOTFOUND, confirmed: null };
        }

        return txstatus; 
    }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTXStatus (" + txid + ")", GetHostStr (arweave) ); tx = null;  }

    return null;
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
         return data;
    }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTxData (" + txid + ")"); }
    return null;
}




async function GetTxStrData (txid)
{    
    const arweave = await Init ();
    
    try
    { 
        const data = await arweave.transactions.getData (txid, {decode: true, string: true} );
        return data; 
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTxStrData (" + txid + ")"); }
 
    return null;
}




async function GetTxRawData (txid)
{    
    const arweave = await Init ();
    
    try
    { 
        const data = await arweave.chunks.downloadChunkedData (txid); 
        return data;
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTxRawData (" + txid + ")"); }
    
}



async function GetTXs ( args = {address: null, tags: null, first: null, sort: null, cursor: null } )
{    
    const query = new GQL.TXQuery (this);
    
    try
    { 
        Sys.VERBOSE ("Querying for transactions..");
        const success = await query.ExecuteReqOwner (args);

        if (success)
            return query;

        else
        {             
            Sys.ERR ("Failed to get transactions for address " + args.owner + " .");
            return null;
        }
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTXsForAddress (" + args.owner + ", " + args.tags + ")"); }    
    
    return null;
}


async function GetTXsForAddress (address, tags = null)
{
    return await GetTXs ({address: address, tags: tags} );    
}


function GetTXStatusStr (statuscode, confirmations)
{

    if (statuscode == TXSTATUS_NOTFOUND)
        return Sys.ANSIERROR ("NOT FOUND / FAILED");


    else if (statuscode == TXSTATUS_PENDING)
        return Sys.ANSIWARNING ("PENDING");


    else if (statuscode == TXSTATUS_OK)
    {
        if (IsConfirmationAmountSafe (confirmations) )
            return "CONFIRMED";
        else
            return Sys.ANSIWARNING ("MINED, LOW CONFIRMATIONS");
    }


    else if (statuscode == null)
        Sys.ERR ("PROGRAM ERROR: TXStatusCodeToStr: statuscode NULL");


    else
        return Sys.ANSIERROR ("Unknown status code: " + statuscode);
    

    return null;
}


function IsTxOKByCode (statuscode) {return statuscode == TXSTATUS_OK; }


class TXStatusInfo
{
    Status        = null;
    StatusCode    = null;
    Confirmations = null;
    MinedAtBlock  = null;

    IsMined     () { return this.StatusCode == TXSTATUS_OK       };
    IsPending   () { return this.StatusCode == TXSTATUS_PENDING  };
    IsFailed    () { return this.StatusCode == TXSTATUS_NOTFOUND };
    IsConfirmed () 
    { 
        if (State.Config.SafeConfirmationsMin == null || isNaN (State.Config.SafeConfirmationsMin) )
        {
            Sys.ERR_ONCE ("Config.SafeConfirmationsMin not properly set!");
            return false;
        }

        else 
            return this.IsMined () && this.Confirmations != null && this.Confirmations >= State.Config.SafeConfirmationsMin; 
    }
    
}

function TXStatusToInfo (txstatus)
{
    if (txstatus != null)
    {
        const info = new TXStatusInfo ();

        const statuscode    = txstatus.status;
        const confirmations = txstatus.confirmed?.number_of_confirmations;
        const mined_at      = txstatus.confirmed?.block_height;

        info.Status        = GetTXStatusStr (statuscode, confirmations);
        info.StatusCode    = statuscode;
        info.Confirmations = confirmations;
        info.MinedAtBlock  = mined_at;

        return info;
    }
    else
        return null;

}

async function GetTXStatusInfo (txid)
{
    return TXStatusToInfo (await GetTXStatus (txid) );
}

module.exports = { Init, Post, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, GetTxRawData, GetPeers,
                   IsConfirmationAmountSafe, GetTXStatusStr, IsTxOKByCode, TXStatusToInfo, GetTXStatusInfo,
                   OutputTxData, GetTXsForAddress, GetNetworkInfo, PrintNetworkInfo, OwnerToAddress, GetMemPool, GetPendingTXAmount,
                   GetTXStatus, GetTXs, WinstonToAR, QuantityToAR, GetLatestTxWithTags, Connect, GetTargetHost, GetConnectionStatus, Tag,
                   TXSTATUS_OK, TXSTATUS_NOTFOUND, TXSTATUS_PENDING, CONNSTATES, TXStatusInfo };