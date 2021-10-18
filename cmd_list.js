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


async function HandleCommand (args)
{
    Util.RequireArgs (args, 1);

    const target = args[0];
    
    Sys.DEBUG ("Attempting to determine what " + target + " is..");
    if (Util.IsArFSID (target) )
    {
        ArFS.ListDriveFiles (target);
        //const tags = [ {"name":"Drive-Id", "values":target} ];
        //txs = await Arweave.GetTXsForAddress (undefined, tags);
        //txs.forEach ( tx => { Sys.OUT_TXT (tx.node.id) } );
    }
    else if (Util.IsArweaveHash (target) )
    {
        Sys.VERBOSE ("Assuming " + target + " is an Arweave-address - getting transactions:");

        txs = await Arweave.GetTXsForAddress (args[0]) 
        txs.forEach ( tx => { Sys.OUT_TXT (tx.node.id) } );
    }
    
        
}


module.exports = { HandleCommand }