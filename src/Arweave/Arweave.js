//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// arweave.js - 2021-10-17_01
// Code to interact with Arweave.
//


// Imports
const ArweaveLib     = require ('arweave');

const CONSTANTS      = require ("../CONSTANTS.js");
const State          = require ("../ProgramState.js");
const Sys            = require ('../System.js');
const Config         = require ('../Config.js');
const Fetch          = require ("../Concurrent");
const { SETTINGS }   = require ("../SETTINGS");
const Util           = require ("../Util");





// Constants
const _TAG             = "Arweave";



/** Initialize and/or get the Arweave-instance. */
function Init ()
{
    if (State.ArweaveInstance == null)
    {        
        Sys.VERBOSE ("Initializing Arweave-js with host " + Config.GetHostString () + " .")

        const ar_instance = ArweaveLib.init
        (
            {
                host:     Config.GetSetting (SETTINGS.ArweaveHost),
                port:     Config.GetSetting (SETTINGS.ArweavePort),
                protocol: Config.GetSetting (SETTINGS.ArweaveProto),
                timeout:  Config.GetSetting (SETTINGS.ArweaveTimeout_ms)
            }
        );               
        
        State.ArweaveInstance = ar_instance; 
    }

    return State.ArweaveInstance;
}



/** Initialize Arweave and verify the connection. Re-initialize if different host. */
async function Connect ()
{    
    
    const desired_host = Config.GetHostString ();
    
    if (State.CurrentHost != desired_host)
    {
        State.ArweaveInstance = null;
        
        Init ();        
        State.CurrentHost = desired_host;

        // Test the connection.
        if (await TestConnection () )
        {
            Sys.INFO ("Connected to " + GetHostStr (State.ArweaveInstance) );
            Sys.VERBOSE ("Using " + Config.GetSetting (SETTINGS.ArweaveTimeout_ms) + "ms timeout.");            
            
        }
        else
            return Config.IsForceful () ? State.ArweaveInstance : null;           
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
            State.ConnectionState = CONSTANTS.CONNSTATES.OK;
            return { State: State.ConnectionState, NetworkInfo: info };
        }
        else
            State.ConnectionState = CONSTANTS.CONNSTATES.FAIL;
    }
    else
        State.ConnectionState = CONSTANTS.CONNSTATES.NOTCONN;

    return { State: State.ConnectionState, NetworkInfo: null }
}


async function CreateNativeTXObj (data, key)
{
    const arweave = await Connect ();
    return await arweave.createTransaction ( {data: data }, key);
}

async function SignNativeTXObj (ntxobj, key)
{
    const arweave = await Connect ();
    return await arweave.transactions.sign (ntxobj, key);
}

async function PostTX (ntxobj, direct = false)
{    
    const txid = ntxobj?.id;

    if (txid == null)
        return Sys.ERR_PROGRAM ("'ntxobj' null or lacking ID", "PostTX");

    const arweave = await Connect ();

    try
    {
        Sys.VERBOSE ("Posting transaction " + txid + " using " + (direct ? "arweave.transactions.post" : "arweave.js uploader") + "...", "PostTX");

        if (direct)
        {
            let { status, statusText } = await arweave.transactions.post (ntxobj);
    
            if (CONSTANTS.TXSTATUSES_POST_OK.includes (status) )
            {
                Sys.VERBOSE ("Transaction " + txid + " successfully posted (response code " + status + ").", "PostTX");
                return true;
            }
            else
            {
                Sys.ERR ("Failed to post transaction " + txid + ": " + statusText + " (response code " + status + ")", "PostTX");
                return false;
            }
        }
        else
        {
            let uploader = await arweave.transactions.getUploader (ntxobj);

            while (! uploader.isComplete) 
            {
                await uploader.uploadChunk ();
                Sys.INFO (uploader.pctComplete + "% done, " + uploader.uploadedChunks + "/" + uploader.totalChunks + " chunks.");
            }
            
            return true;
        }
    }
    catch (exception)
    {
        Sys.ERR ("Error while trying to post transaction " + txid + ": " + exception);
        return false;
    }
}

async function PostTXDirect   (ntxobj) { return (await PostTX (ntxobj, true)  ); }
async function PostTXUploader (ntxobj) { return (await PostTX (ntxobj, false) ); }


async function ReadWalletJSON (filename)
{
    if (filename == null)
    {
        Sys.ERR ("Wallet filename not provided.");
        return null;
    }

    const wallet_json = await Sys.ReadFile (filename);
    
    if (wallet_json == null)
    {
        Sys.ERR ("Failed to read the wallet file.");
        return null;
    }

    const wallet_obj = Util.JSONToObj (wallet_json);
    
    if (wallet_obj == null)
    {
        Sys.ERR ("Failed to parse the wallet file - not a valid JSON-file.");
        return null;
    }

    return wallet_obj;
}


function GetTargetHost ()
{
    return State.ArweaveInstance != null ? GetHostStr (State.ArweaveInstance) : Config.GetHostString ();
}

async function GetWalletAddress (wallet_json)
{
    return await (Init ())?.wallets.getAddress (wallet_json);
}

async function GetWalletBalance (wallet_json)
{
    const addr = await GetWalletAddress (wallet_json);
    return await (Init ())?.wallets.getBalance (addr);
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
    return confirmations != null && Number (confirmations) >= State.GetSetting (SETTINGS.SafeConfirmationsMin);
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
                return Config.IsForceful () ? r : null;
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
            const ret = await arweave.api.get (CONSTANTS.ENDPOINT_PENDING);
            if (ret.data != null)
                return ret.data;
        }
        catch (exception) { Sys.ON_EXCEPTION (exception, "Arweave.GetMemPool", GetHostStr (arweave) ); }
    }

    return null;
}

async function GetMemPoolSize ()
{
    return (await GetMemPool ())?.length;
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

    if (statuscode == CONSTANTS.TXSTATUS_NOTFOUND)
        return Sys.ANSIERROR ("NOT FOUND");


    else if (statuscode == CONSTANTS.TXSTATUS_PENDING)
        return Sys.ANSIWARNING ("PENDING");


    else if (statuscode == CONSTANTS.TXSTATUS_OK)
    {
        if (IsConfirmationAmountSafe (confirmations) )
            return "CONFIRMED";
        else
            return Sys.ANSIWARNING ("MINED");
    }


    else if (statuscode == null)
        Sys.ERR_PROGRAM ("statuscode NULL", "GetTXStatusStr");


    else
        return Sys.ANSIERROR ("Unknown status code: " + statuscode);
    

    return null;
}


function IsTxOKByCode (statuscode) {return statuscode == CONSTANTS.TXSTATUS_OK; }






module.exports = { Init, Post, DisplayArweaveInfo, SearchTag, GetTx, GetTxData, GetTxStrData, GetTxRawData, GetPeers,
                   IsConfirmationAmountSafe, GetTXStatusStr, IsTxOKByCode,
                   OutputTxData, GetTXsForAddress, GetNetworkInfo, PrintNetworkInfo, OwnerToAddress, GetMemPool, GetMemPoolSize, GetPendingTXAmount,
                   GetTXStatus, GetTXs, WinstonToAR, QuantityToAR, Connect, GetTargetHost, GetConnectionStatus, GetRecipient,
                   ReadWalletJSON, GetWalletAddress, GetWalletBalance, CreateNativeTXObj, SignNativeTXObj,
                   PostTX, PostTXDirect, PostTXUploader,
                   TXSTATUS_OK       : CONSTANTS.TXSTATUS_OK, 
                   TXSTATUS_NOTFOUND : CONSTANTS.TXSTATUS_NOTFOUND, 
                   TXSTATUS_PENDING  : CONSTANTS.TXSTATUS_PENDING,
                   CONNSTATES        : CONSTANTS.CONNSTATES, 
                   };