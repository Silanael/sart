//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_info.js - 2021-10-30_01
// Command 'info'
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
    "tx": Handler_TX
};


function Help (args)
{
    Sys.INFO ("INFO USAGE");
    Sys.INFO ("----------");
    Sys.INFO ("");
    Sys.INFO ("Show transaction info:")
    Sys.INFO ("   info <txid>");
    Sys.INFO ("");
    Sys.INFO ("Show transaction tags:")
    Sys.INFO ("   info <txid> tags");    
    Sys.INFO ("");
}



async function HandleCommand (args)
{
    const target = args.RequireAmount (1).Pop ();

    const info =
    {
        Type:         "UNKNOWN",
        Identifier:   target,
        Network:      "Arweave",
        Valid:        false,   
    }

    const handler = SUBCOMMANDS[target.toLowerCase () ];

    // Invoke handler if found
    if (handler != null)
    {
        Sys.VERBOSE ("INFO: Invoking subcommand-handler for '" + target + "'...");
        await handler (args, info);
    }


    // Arweave-hash, could be either an address or a transaction.
    else if (Util.IsArweaveHash (target) )
    {
        // Check for transaction
        const tx = await Arweave.GetTx (target);
        if (tx != null)
            await Handler_TX (args, info, tx);
    }

    else
        Sys.ERR_FATAL ("Unable to determine what '" + target + "' is. Valid commands are: " + SUBCOMMANDS.toString() );
  
    if (info.Valid)
        PrintObj_Out (info);
}



async function Handler_TX (args, info, tx = null)
{

    if (tx == null)
    {
        const txid = args.RequireAmount (1).Pop ();
        Sys.VERBOSE ("INFO: Processing TXID: " + txid);

        if (Util.IsArweaveHash (txid) )
            tx = await Arweave.GetTx (txid);
        else
            Sys.ERR_FATAL ("Not a valid transaction id: " + txid);

        if (tx == null)
            Sys.ERR_FATAL ("Failed to retrieve transaction '" + txid + "'.");
    }

    
    info.Type     = "Transaction";
    info.TXFormat = tx.format;
    info.TXID     = tx.id;
    info.Address  = await Arweave.OwnerToAddress (tx.owner);             
    info.LastTX   = tx.last_tx;
    
    if (Util.IsSet (tx.target) ) info.Target   = tx.target;   
    

    // Tags
    info.TagsAmount = tx.tags?.length > 0 ? tx.tags.length : 0;
    if (info.TagsAmount > 0)
        Util.DecodeTXTags (tx, info, "TAG:");        


    // Data
    if (tx.data_size != null && tx.data_size > 0)
    {
        info.DataSize_Bytes = tx.data_size;            
        info.DataLocation   = tx.data?.length > 0 ? "TX" : "DataRoot";
        
        if (tx.data_root != null && tx.data_root != "")
            info.DataRoot = tx.data_root;
    }

    // Monetary transfer
    if (tx.quantity > 0)
    {            
        info.TransferFrom      = info.Address;
        info.TransferTo        = info.Target;
        info.TransferAmount_AR = tx.quantity;
        if (info.Target == null || info.Target == "")
        {
            Sys.ERR ("Transaction " + target + " has quantity set, but no target!");
            info.Errors =  info.Errors != null ? info.Errors : "" + "Quantity set but no target. ";
        }
    }        

    info.Valid = true;
}


module.exports = { HandleCommand, Help, SUBCOMMANDS }