//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_status.js - 2021-10-31_01
// Command 'status'
//

// Imports
const OS           = require ('os');

const Constants = require ("./CONST_SART.js");
const State     = require ("./ProgramState.js");
const Sys          = require ('./sys.js');
const Settings     = require ('./settings.js');
const Util         = require ('./util.js');
const Arweave      = require ('./arweave.js');
const ArFS         = require ('./ArFS.js');
const ArFSDefs     = require ('./CONST_ARFS.js');
const GQL          = require ('./GQL.js');
const ArFS_DEF = require('./CONST_ARFS.js');



const SUBCOMMANDS = 
{    
    "tx":      Handler_TX,
    "arfs":    Handler_ArFS,
    "drive"  : async function (args) { return await Handler_ArFS (args, null, ArFS_DEF.ENTITYTYPE_DRIVE);  },
    "file"   : async function (args) { return await Handler_ArFS (args, null, ArFS_DEF.ENTITYTYPE_FILE);   },
    "folder" : async function (args) { return await Handler_ArFS (args, null, ArFS_DEF.ENTITYTYPE_FOLDER); },    
    "arweave": Handler_Arweave,
    "pending": Handler_PendingAmount,    
};

//const ALIASES_PENDING = ["amount", "pending", "pendings", "total"];
const ARWEAVE_FIELDS  = "network, version, release, height, current, blocks, peers, queue_length, node_state_latency";


function Help (args)
{
    Sys.INFO ("------------");
    Sys.INFO ("STATUS USAGE");
    Sys.INFO ("------------");
    Sys.INFO ("");    
    Sys.INFO ("Status of the Arweave-network:")
    Sys.INFO ("   status arweave [property]");
    Sys.INFO ("");
    Sys.INFO ("Transaction status:")
    Sys.INFO ("   status tx [txid]");
    Sys.INFO ("");
    Sys.INFO ("Health-check of an ArFS-entity:")
    Sys.INFO ("   status (arfs) [drive/folder/file] <arfs-id>");    
    Sys.INFO ("");
    Sys.INFO ("Arweave-Base64s default to TX, ArFS-IDs are handled by ARFS.");    
}




// TODO: Make a class containing a generic implementation of this.
async function HandleCommand (args)
{

    if (args.GetAmount () <= 0)
    {        
        const conn_status = await Arweave.GetConnectionStatus ();

        const status =
        {
            "Arweave-host"      : await Arweave.GetTargetHost (),             
            "Memory"            : OS.freemem () + " bytes free"
        }

        if (conn_status.State == Arweave.CONNSTATES.OK)
        {
            if (conn_status.NetworkInfo != null)
            {
                status ["Network version"]  = conn_status.NetworkInfo.version + "." + conn_status.NetworkInfo.release
                status ["Network-peers"]    = conn_status.NetworkInfo.peers;
                status ["Arweave-blocks"]   = conn_status.NetworkInfo.blocks;
            }
            status ["Network pending TX"] = await Arweave.GetPendingTXAmount ();
        }

        Sys.INFO ("");
        Sys.OUT_OBJ (status);
        Sys.INFO ("");
        Sys.INFO ("'HELP STATUS' for usage information.");
        Sys.INFO ("Valid subcommands: " + Util.KeysToStr (SUBCOMMANDS) );
        
        return true;
    }

    else
    {
        const target  = args.Pop ();    
        const handler = SUBCOMMANDS[target.toLowerCase () ];

        // Invoke handler if found
        if (handler != null)
        {
            Sys.VERBOSE ("STATUS: Invoking subcommand-handler for '" + target + "'...");
            const ret = handler (args);
            return ret;
        }


        // Arweave-hash, only transactions applicable.
        else if (Util.IsArweaveHash (target) )
        {
            const ret = await Handler_TX (args, target);
            return ret;
        }

        // ArFS-ID.
        else if (Util.IsArFSID (target) )    
        {
            Sys.VERBOSE ("Assuming " + target + " is an ArFS-ID.");
            await Handler_ArFS (args, target);
        }
        
        else
            return Sys.ERR_ABORT ("Unable to determine what '" + target + "' is. Valid commands are: " + Util.KeysToStr (SUBCOMMANDS) );
    
        return false;
    }
}



async function Handler_TX (args, txid = null)
{
        
    if (txid == null)
        txid = args.Pop ();
    
    if (txid != null)
    {        
        const status   = { TXID: txid };        
        const txstatus = await Arweave.GetTXStatus (txid);

        if (txstatus != null)
        {            
            const info = { ItemType: "Transaction", TXID: txid }

            Util.CopyKeysToObj (Arweave.TXStatusToInfo (txstatus), info);

            Sys.OUT_OBJ (info);
        }
        else
            Sys.ERR ("PROGRAM ERROR: Failed to retrieve status-object for transaction '" + txid + "'.");

        
        return true;
    }
    else
        return Sys.ERR_MISSING_ARG ("Transaction ID (TXID) required.");

}



async function Handler_ArFS (args, arfs_id = null, entity_type = null)
{
    
    if (arfs_id == null)
    {
        if (! args.RequireAmount (entity_type != null ? 1 : 2, "Entity-Type (" + ArFS_DEF.ARFS_ENTITY_TYPES.toString () +") and ArFS-ID required.") )
            return false;
    
        if (entity_type == null)
            entity_type = args.PopLC ();

        arfs_id = args.Pop ();

        if ( ! ArFS_DEF.IsValidEntityType (entity_type) && 
             ! Sys.ERR_OVERRIDABLE ("Unknown entity type '" + entity_type + "'. Valid ones: " + ArFS_DEF.ARFS_ENTITY_TYPES.toString() ) )
             return false;
    }
    else if (entity_type == null)
        entity_type = args.PopLC ();
    
    const entity = await ArFS.UserGetArFSEntity (arfs_id, entity_type);

    if (entity != null)
    {
        await entity.UpdateDetailed (Arweave, true, true);
           
        Sys.OUT_OBJ (entity.GetStatusInfo (), { recursive_fields: entity.RecursiveFields } );
        Sys.INFO ("");
        Sys.INFO ("(Use INFO to get detailed entity information and VERIFY to check the integrity of files)");
        return true;       
    }

    //return await DisplayArFSEntity (args.Pop (), entity_type);    
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
            Sys.OUT_OBJ (network_status);
        
        if (Object.keys (network_status)?.length > 60)
            Sys.ERR ("Request response implausible.");
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