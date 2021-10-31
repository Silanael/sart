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
const { PrintObj_Out } = require("./PrintObj_Out");



const SUBCOMMANDS =
{
    "tx"           : Handler_TX,
    "txtags"       : Handler_TXTags,
    "txdata"       : Handler_Data,
    "txrawdata"    : Handler_RawData,
    "pathmanifest" : Handler_RawData,    
    "arweave"      : Handler_Arweave,
    "file"         : Handler_ArFS,
    "mempool"      : Handler_MemPool,
    "pending"      : Handler_PendingAmount,
    "config"       : Handler_Config
}

const ALIASES_PENDING = ["amount", "pending", "pendings", "total"];
const ARWEAVE_FIELDS  = "network, version, release, height, current, blocks, peers, queue_length, node_state_latency";


function Help (args)
{
    Sys.INFO ("GET USAGE");
    Sys.INFO ("---------");
    Sys.INFO ("");
    Sys.INFO ("SUBCOMMANDS: tx, txtags, txdata, txrawdata, file, arweave, mempool, pending, config");
    Sys.INFO ("");
    Sys.INFO ("Get a file from a transaction:")
    Sys.INFO ("   get file [txid] > file.ext");
    Sys.INFO ("");
    Sys.INFO ("Get an ArDrive-file:")
    Sys.INFO ("   get file [file-id] > file.ext");
    Sys.INFO ("");
    Sys.INFO ("Get transaction in JSON format:")
    Sys.INFO ("   get tx [txid] > tx.json");
    Sys.INFO ("");
    Sys.INFO ("Get transaction tags:")
    Sys.INFO ("   get tx [txid] tags");
    Sys.INFO ("");
    Sys.INFO ("Get transaction data:")
    Sys.INFO ("   get txdata [txid] > file.ext");
    Sys.INFO ("");
    Sys.INFO ("Get path manifest:")
    Sys.INFO ("   get txrawdata [txid] > manifest.json");
    Sys.INFO ("");
    Sys.INFO ("Get Arweave network status:")
    Sys.INFO ("   get arweave [field]");
    Sys.INFO ("");
    Sys.INFO ("Get network pending transactions:")
    Sys.INFO ("   get pending");    
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

        // Append mempool size
        network_status["pending_tx_amount"] = await Arweave.GetPendingTXAmount ();


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
    const field = args.Pop ();

    if (Util.IsArweaveHash (txid) )
    {
        const tx = await Arweave.GetTx (txid);
        
        // Another argument given, output only one field.
        if (field != null)
        {
            if (Util.StrCmp (field, "tags") )
                PrintObj_Out (Util.DecodeTXTags (tx) )

            else if (tx[field] != null)
                PrintObj_Out (tx[field]);

            else
                Sys.ERR ("TX: Unknown field '" + field + "'.");
        }
            
        // Print the entire TX.
        else                    
            PrintObj_Out (tx);        

    }
    else
        Sys.ERR_FATAL ("Invalid argument: '" + txid + "' - not a transaction ID.");
}



async function Handler_TXTags (args)
{
    const txid = args.RequireAmount (1).Pop ();

    if (Util.IsArweaveHash (txid) )
    {
        const tx = await Arweave.GetTx (txid);
        const len = tx.tags != null ? tx.tags.length : 0;
        
        if (len <= 0)
            Sys.ERR ("No tags obtained from transaction " + txid + " !");

        else
            PrintObj_Out (Util.DecodeTXTags (tx).entries )

    }
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




async function Handler_MemPool (args, show_amount = false)
{
    const param   = args?.PopLC ();
    const mempool = await Arweave.GetMemPool ();
    
    if (mempool == null)
    {
        Sys.ERR ("Failed to retrieve the mempool!")
        return false;
    }
    
    else if (show_amount || ALIASES_PENDING.includes (param) )
        Sys.OUT_TXT (mempool.length);

    else
        PrintObj_Out (mempool);

}


async function Handler_PendingAmount ()
{
    return Handler_MemPool (null, true);
}


async function Handler_Config ()
{
    PrintObj_Out (Settings.Config);
}



module.exports = { HandleCommand, Help }