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

const Constants   = require ("./CONST_SART.js");
const State       = require ("./ProgramState.js");
const Sys         = require ('./System.js');
const Settings    = require ('./Settings.js');
const Fetch       = require ("./Concurrent");






// Constants
const _TAG             = "Arweave";



/** Initialize and/or get the Arweave-instance. */
function Init ()
{
    if (State.ArweaveInstance == null)
    {
        const Config = State.GetConfig ();
        Sys.VERBOSE ("Initializing Arweave-js with host " + Settings.GetHostString () + " .")

        State.ArweaveInstance = ArweaveLib.init
        (
            {
                host:     Config.ArweaveHost,
                port:     Config.ArweavePort,
                protocol: Config.ArweaveProto,
                timeout:  Config.ArweaveTimeout_ms,
            }
        );    
 
    }

    return State.ArweaveInstance;
}



/** Initialize Arweave and verify the connection. Re-initialize if different host. */
async function Connect (args)
{    
    const hoststr = args != null ? args.Pop () : null;

    if (hoststr != null)
        Settings.SetHost (hoststr);

    const desired_host = Settings.GetHostString ();
    const config       = State.GetConfig ();

    if (State.CurrentHost != desired_host)
    {
        State.ArweaveInstance = null;
        
        Init ();        
        State.CurrentHost = desired_host;

        // Test the connection.
        if (await TestConnection () )
        {
            Sys.INFO ("Connected to " + GetHostStr (State.ArweaveInstance) );
            Sys.VERBOSE ("Using " + config.ArweaveTimeout_ms + "ms timeout.");            
            
        }
        else
            return Settings.IsForceful () ? State.ArweaveInstance : null;           
    }
    
    return State.ArweaveInstance; 
}




async function TestConnection ()
{
    if (State.ArweaveInstance != null)
    {
        const info = await GetNetworkInfo ();
        
        if (info != null)
        {            
            State.ConnectionState = Constants.CONNSTATES.OK;
            return { State: State.ConnectionState, NetworkInfo: info };
        }
        else
            State.ConnectionState = Constants.CONNSTATES.FAIL;
    }
    else
        State.ConnectionState = Constants.CONNSTATES.NOTCONN;

    return { State: State.ConnectionState, NetworkInfo: null }
}



function GetTargetHost ()
{
    return State.ArweaveInstance != null ? GetHostStr (State.ArweaveInstance) : Settings.GetHostString ();
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
    const arweave = await Connect ();

    if (arweave != null && data_obj != null)
    {        
        try
        {
            const  fetch = new Fetch (arweave.api.post (host_str, data_obj), "Arweave.Post");
            await  fetch.Execute ();
            return fetch.GetReturnValue ();            
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
    const arweave = Init ();
    return arweave != null ? await arweave.wallets.ownerToAddress (owner) : null;
}


function WinstonToAR (winston_amount)
{
    const arweave  = Init ();
    return arweave != null ? arweave.ar.winstonToAr (winston_amount) : null;
}

function QuantityToAR (quantity)   { return WinstonToAR (quantity); }
function GetRecipient (arweave_tx) { return arweave_tx != null && arweave_tx.target != null && arweave_tx.target != "" ? arweave_tx.target : null }


async function DisplayArweaveInfo ()
{
    const ret = await GetnetworkInfo ();
    
    if (ret != null)
        Sys.OUT_TXT (ret);    
}


async function GetNetworkInfo ()
{ 
    const arweave = await Connect ();

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
    const arweave = await Connect ();
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
    const arweave = await Connect ();
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
    const arweave = await Connect ();

    Sys.VERBOSE ("Searching for tag:'" + tag + "'='" + value + "':");
    const files = await arweave.transactions.search (tag, value);    
}


// TODO: Separate this try-catch -stuff into a common function.
async function GetTx (txid)
{    
    const arweave = await Connect ();    
    
    if (arweave != null)
    {
        try               
        { 
            const fetch = new Fetch (arweave.transactions.get (txid), "Arweave.GetTX (" + txid + ")" );
            await fetch.Execute ();
            return fetch.GetReturnValue ();              
        }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTx (" + txid + ")"); tx = null;  }
    }

    return null;
}


async function GetTXStatus (txid)
{
    const arweave  = await Connect ();  

    try
    {
        const  fetch = new Fetch (arweave.transactions.getStatus (txid), "Arweave.GetTXStatus (" + txid + ")" );
        await  fetch.Execute ();
        return fetch.GetReturnValue ();    
    }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTXStatus (" + txid + ")", GetHostStr (arweave) ) }

    return null;
}




async function OutputTxData (txid)
{    
     const arweave = await Connect ();

     try
     {
        arweave.transactions.getData (txid, {decode: true} )                
                 .then ( data => { process.stdout.write (data) } );
     }
     catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.OutputTxData (" + txid + ")"); tx = null;  }
}





async function GetTxData (txid)
{ 
    const arweave = await Connect ();     
    
    try               
    { 
        const fetch = new Fetch (arweave.transactions.getData (txid, {decode: true}), "Arweave.GetTXData (" + txid + ")" );
        await fetch.Execute ();
        return fetch.GetReturnValue ();         
    }
    catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetTxData (" + txid + ")"); }
    return null;
}




async function GetTxStrData (txid)
{    
    const arweave = await Connect ();
    
    try
    { 
        const fetch = new Fetch (arweave.transactions.getData (txid, {decode: true, string: true} ), "Arweave.GetTXData (" + txid + ")" );
        await fetch.Execute ();
        return fetch.GetReturnValue ();                         
    }
    catch (exception) {  Sys.ON_EXCEPTION (exception, "Arweave.GetTxStrData (" + txid + ")"); }
 
    return null;
}




async function GetTxRawData (txid)
{    
    const arweave = await Connect ();
    
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

    if (statuscode == Constants.TXSTATUS_NOTFOUND)
        return Sys.ANSIERROR ("NOT FOUND / FAILED");


    else if (statuscode == Constants.TXSTATUS_PENDING)
        return Sys.ANSIWARNING ("PENDING");


    else if (statuscode == Constants.TXSTATUS_OK)
    {
        if (IsConfirmationAmountSafe (confirmations) )
            return "CONFIRMED";
        else
            return Sys.ANSIWARNING ("MINED, LOW CONFIRMATIONS");
    }


    else if (statuscode == null)
        Sys.ERR_PROGRAM ("statuscode NULL", "GetTXStatusStr");


    else
        return Sys.ANSIERROR ("Unknown status code: " + statuscode);
    

    return null;
}


function IsTxOKByCode (statuscode) {return statuscode == Constants.TXSTATUS_OK; }






module.exports = { Init, Post, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, GetTxRawData, GetPeers,
                   IsConfirmationAmountSafe, GetTXStatusStr, IsTxOKByCode,
                   OutputTxData, GetTXsForAddress, GetNetworkInfo, PrintNetworkInfo, OwnerToAddress, GetMemPool, GetPendingTXAmount,
                   GetTXStatus, GetTXs, WinstonToAR, QuantityToAR, Connect, GetTargetHost, GetConnectionStatus, GetRecipient,
                   TXSTATUS_OK       : Constants.TXSTATUS_OK, 
                   TXSTATUS_NOTFOUND : Constants.TXSTATUS_NOTFOUND, 
                   TXSTATUS_PENDING  : Constants.TXSTATUS_PENDING,
                   CONNSTATES        : Constants.CONNSTATES, 
                   };