//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_get.js - 2021-10-26_01
// GET-command handler.
//


// Imports
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Util     = require ('./util.js');
const Arweave  = require ('./arweave.js');
const ArFS     = require ('./ArFS.js');
const GQL      = require ('./GQL.js');



const SUBCOMMANDS =
{
    "tx"           : Handler_TX,
    "txtags"       : null,
    "txdata"       : Handler_Data,
    "txrawdata"    : Handler_RawData,
    "pathmanifest" : Handler_RawData,    
    "arweave"      : Handler_Arweave,
    "file"         : Handler_ArFS,
}

const ARWEAVE_FIELDS = "network, version, release, height, current, blocks, peers, queue_length, node_state_latency";


function Help (args)
{
    Sys.INFO ("GET USAGE");
    Sys.INFO ("---------");
    Sys.INFO ("");
    Sys.INFO ("Get a file from a transaction:")
    Sys.INFO ("   get file [txid] > file.ext");
    Sys.INFO ("");
    Sys.INFO ("Get an ArDrive-file:")
    Sys.INFO ("   get file [file-id] > file.ext");
    Sys.INFO ("");
    Sys.INFO ("Get transaction in JSON format:")
    Sys.INFO ("   get tx [txid]");
    Sys.INFO ("");
    Sys.INFO ("Get transaction data:")
    Sys.INFO ("   get txdata [txid] > file.ext");
    Sys.INFO ("");
    Sys.INFO ("Get path manifest:")
    Sys.INFO ("   get txrawdata [txid] > manifest.json");
    Sys.INFO ("");
    Sys.INFO ("Get Arweave network status:")
    Sys.INFO ("   get arweave");
    Sys.INFO ("");
    Sys.INFO ("Get specific Arweave network info:")
    Sys.INFO ("   get arweave [field]");
    Sys.INFO ("");
    Sys.INFO ("");
    Sys.INFO ("NOTE: Don't run with NPM, instead use:");
    Sys.INFO ("   node ./main.js get ...");
    Sys.INFO ("");
    
}


async function HandleCommand (args)
{
    const subcmd  = args.RequireAmount (1).PopLC ();    
    const handler = SUBCOMMANDS[subcmd];


    if (handler != null)        
    {
        Sys.DEBUG ("Executing sub-command '" + subcmd + "'...");
        await handler (args);
    }
    else
        Sys.ERR_FATAL ("GET: Unknown sub-command '" + subcmd + "'.");

}



async function Handler_Arweave (args)
{
    const network_status = await Arweave.GetNetworkInfo ();
    
    if (network_status != null)
    {
        // User wants a specific argument.
        if (args.HasNext () )
        {
            const property = args.PopLC ();
            if (network_status[property] != null)
                Sys.OUT_TXT(network_status[property]);
            else
                Sys.ERR ("Unknown Arweave-property '" + property + "'.\nPROPERTIES: " + ARWEAVE_FIELDS);
        }
        // List all
        else
            PrintObj_Out (network_status);
        
    }
    else
        Sys.ERR ("Unable to fetch Arweave network status.");
}




async function Handler_TX (args)
{
    const txid = args.RequireAmount (1).Pop ();

    if (Util.IsArweaveHash (txid) )
        Sys.OUT_TXT (await Arweave.GetTx (txid) );
    else
        Sys.ERR_FATAL ("Invalid argument: '" + txid + "' - not a transaction ID.");
}




async function Handler_Data (args)
{
    const txid = args.RequireAmount (1).Pop ();

    if (Util.IsArweaveHash (txid) )
        Sys.OUT_BIN (await Arweave.GetTxData (txid) );
    else
        Sys.ERR_FATAL ("Invalid argument: '" + txid + "' - not a transaction ID.");
}





async function Handler_RawData (args)
{
    const txid = args.RequireAmount (1).Pop ();

    if (Util.IsArweaveHash (txid) )
        Sys.OUT_BIN (await Arweave.GetTxRawData (txid) );
    else
        Sys.ERR_FATAL ("Invalid argument: '" + txid + "' - not a transaction ID.");
}



// TODO: Move to ArFS.js.
async function Handler_ArFS (args)
{
    const target = args.RequireAmount (1).Pop ();

    if (Util.IsArFSID (target) )
    {
        const file = new ArFS.ArFSFile (target, null, null, null);
        await file.Update ();

        if (file.Valid && file.IsFile () )
            await file.Download ();

        else
            Sys.ERR_FATAL ("Download failed: Target " + target + " doesn't exist, isn't a file or failed to fetch.");
    }

    else if (Util.IsArweaveHash (target) )
    {
        Sys.WARN ("Downloading transaction data from TX: " + target + " ...");
        Sys.OUT_BIN (await Arweave.GetTxData (target) );
    }
    else
        Sys.ERR_FATAL ("Invalid target: '" + target + "' - not an ArFS-ID or a transaction ID.");
}






// TODO: Move to Util.
function PrintObj_Out (obj)
{
    if (obj == null)
        return false;

    // Get longest field name
    let longest_len = 0;
    Object.entries(obj).forEach ( e => { if (e[0]?.length > longest_len) longest_len = e[0].length; }  );

    // list all
    Object.entries(obj).forEach
    ( e => 
    { 
        Sys.OUT_TXT (e[0]?.toUpperCase()?.padEnd (longest_len, " ") + "  " + e[1]);
    }  
    );
}


module.exports = { HandleCommand, Help }