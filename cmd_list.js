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


async function HandleCommand (args)
{
    Util.RequireArgs (args, 1);
    txs = await Arweave.GetTXsForAddress ("zPZe0p1Or5Kc0d7YhpT5kBC-JUPcDzUPJeMz2FdFiy4")
 
    txs.forEach ( tx => { Sys.OUT_TXT (tx.node.id) } );
}


module.exports = { HandleCommand }