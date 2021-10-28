//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_list.js - 2021-10-18_01
// Command 'list'
//

// Imports
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Util     = require ('./util.js');
const Arweave  = require ('./arweave.js');
const ArFS     = require ('./ArFS.js');
const GQL      = require ('./GQL.js');


const Targets =
{    
    "tx"          : ListTXs,
    "drive"       : ListDrive,
    "drives"      : ListDrives,
}


function Help (args)
{
    Sys.INFO ("LIST USAGE");
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
    args.RequireAmount (1);

    const arfs_url = new ArFS.ArFSURL (args.Pop () );
    
    if (arfs_url.IsValid () )
    {        
        const drive = new ArFS.ArFSDrive (arfs_url.DriveID);
        await drive.List (arfs_url); 
    }
    
    /*
    const target = args[0];
    target_lower = target.toLowerCase ();


    // Target not in the list, try to guess what it is
    if (Targets[target_lower] == null)
    {
        Sys.DEBUG ("Attempting to determine what " + target + " is..");
    
        if      (Util.IsArFSID      (target) ) target_lower = "drive";
        else if (Util.IsArweaveHash (target) ) target_lower = "tx";
        else                                   Sys.ERR_FATAL ("Unknown target: " + target, "LIST")
    }
    else
        args.shift ();


    // Call the sub-handler
    Targets[target_lower] (args);
    */
}


async function ListTXs (args)
{
    const fn_tag = "LIST TX";
    Util.RequireArgs (args, 1, fn_tag);

    txs = await Arweave.GetTXsForAddress (args[0]) 
    txs.forEach ( tx => { Sys.OUT_TXT (tx.node.id) } );
}


async function ListDrive (args)
{
    const fn_tag = "LIST DRIVE";    
    Util.RequireArgs (args, 1, fn_tag);

    const drive_id = args[0];

    ArFS.ListDriveFiles (drive_id);
}


async function ListDrives (args)
{
    const fn_tag = "LIST DRIVES";
    
    ArFS.ListDrives (args[0]);

}


module.exports = { HandleCommand, Help }