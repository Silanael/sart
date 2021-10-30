//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_list.js - 2021-10-30_01
// Command 'info'
//

// Imports
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Util     = require ('./util.js');
const Arweave  = require ('./arweave.js');
const ArFS     = require ('./ArFS.js');
const GQL      = require ('./GQL.js');


function Help (args)
{
    Sys.INFO ("INFO USAGE");
    Sys.INFO ("----------");
    Sys.INFO ("");
    Sys.INFO ("List drive content:")
    Sys.INFO ("   list <drive-id>");
    Sys.INFO ("");
    Sys.INFO ("List root directory content:")
    Sys.INFO ("   list <drive-id>/");
    Sys.INFO ("");
    Sys.INFO ("List folder content:")
    Sys.INFO ("   list <drive-id>/path/<folder>/<folder>");
    Sys.INFO ("");
    Sys.INFO ("List content of folder and all of its subfolders:")
    Sys.INFO ("   list <drive-id>/path/<folder>/<folder> -r");
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
        //Address:        null,
        //Target:       null,
        //Errors:       null,
        //TagsAmount:   0,
        //Tags:         null,
        //DataSize_B:   0,
        //DataLocation: null,
    }


    // See if target is a transaction.
    const tx = await Arweave.GetTx (target);

    if (tx != null)
    {
        info.Type     = "Transaction";
        info.TXFormat = tx.format;
        info.TXID     = target;
        info.Address  = await Arweave.OwnerToAddress (tx.owner);             
        info.LastTX   = tx.last_tx;
        if (Util.IsSet (tx.target) ) info.Target   = tx.target;   
        


        // Tags
        info.TagsAmount = tx.tags?.length > 0 ? tx.tags.length : 0;
        if (info.TagsAmount > 0)
            info.Tags = Util.DecodeTXTags (tx).entries;


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
        Sys.INFO (info);
    }
     
}



module.exports = { HandleCommand, Help }