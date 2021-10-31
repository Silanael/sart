//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_status.js - 2021-10-31_01
// Command 'status'
//

// Imports
const Sys          = require ('./sys.js');
const Settings     = require ('./settings.js');
const Util         = require ('./util.js');
const Arweave      = require ('./arweave.js');
const ArFS         = require ('./ArFS.js');
const GQL          = require ('./GQL.js');
const PrintObj_Out = require("./PrintObj_Out").PrintObj_Out;


const SUBCOMMANDS = 
{    
    "tx":      Handler_TX,
    "arfs":    Handler_ArFS,
    "arweave": Handler_Arweave,
    "pending": Handler_PendingAmount,    
};

//const ALIASES_PENDING = ["amount", "pending", "pendings", "total"];
const ARWEAVE_FIELDS  = "network, version, release, height, current, blocks, peers, queue_length, node_state_latency";


function Help (args)
{
    Sys.INFO ("STATUS USAGE");
    Sys.INFO ("------------");
    Sys.INFO ("");
    Sys.INFO ("SUBCOMMANDS: tx, arweave, arfs");
    Sys.INFO ("");
    Sys.INFO ("Show Arweave status:")
    Sys.INFO ("   status arweave [property]");
    Sys.INFO ("");
    Sys.INFO ("Show transaction status:")
    Sys.INFO ("   status tx [txid]");    
    Sys.INFO ("");
}


// TODO: Make a class containing a generic implementation of this.
async function HandleCommand (args)
{
    const target  = args.RequireAmount (1).Pop ();    
    const handler = SUBCOMMANDS[target.toLowerCase () ];

    // Invoke handler if found
    if (handler != null)
    {
        Sys.VERBOSE ("STATUS: Invoking subcommand-handler for '" + target + "'...");
        await handler (args);
    }


    // Arweave-hash, only transactions applicable.
    else if (Util.IsArweaveHash (target) )
        await Handler_TX (args, target);
    
    else
        Sys.ERR_FATAL ("Unable to determine what '" + target + "' is. Valid commands are: " + SUBCOMMANDS.toString() );
  
}



async function Handler_TX (args, txid = null)
{

    if (txid == null) txid = args.RequireAmount (1).Pop ();
    
    if (txid != null)
    {
        const status   = { TXID: txid };        
        const txstatus = await Arweave.GetTXStatus (txid);

        if (txstatus != null)
        {
            // Yeah yeah, I'll read about the status codes at some point.
            const is_confirmed = txstatus["confirmed"] != null;
            
            status.State      = is_confirmed ? "Confirmed" : "Pending";            
            status.StatusCode = txstatus.status;
            if (is_confirmed)
            {
                status.Confirmations    = txstatus.confirmed.number_of_confirmations;
                status.ConfirmedAtBlock = txstatus.confirmed.block_height;                
            }            
        }
        else
            Sys.ERR ("Failed to retrieve status for transaction '" + txid + "'.");

        PrintObj_Out (txstatus, { txt_obj: status} );
    }
    else
        Sys.ERR_MISSING_ARG ();

}


async function Handler_ArFS (args, arfs_id = null)
{
    /*
    if (txid == null) txid = args.RequireAmount (1).Pop ();
    
    if (txid != null)
    {
        const txstatus = await Arweave.GetTXStatus (txid);
        if (txstatus != null)
            PrintObj_Out (txstatus);
        else
            Sys.ERR ("Failed to retrieve status for transaction '" + txid + "'.");
    }
    else
        Sys.ERR_MISSING_ARG ();
    */
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



async function Handler_PendingAmount ()
{    
    const mempool = await Arweave.GetMemPool ();
    
    if (mempool == null)
    {
        Sys.ERR ("Failed to retrieve the mempool!")
        return false;
    }
    else    
        Sys.OUT_TXT (mempool.length);    
}


module.exports = { HandleCommand, Help, Handler_PendingAmount, SUBCOMMANDS }