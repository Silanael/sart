//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// arweave.js - 2021-10-17_01
// Code to interact with Arweave.
//

// Imports
const Arweave  = require ('arweave');
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Util     = require ('./util.js');




function Init ()
{
    Sys.VERBOSE ("Connecting to " + Settings.GetHostString () + "...")
    
    const Config = Settings.Config;

    let arweave = Arweave.init
    (
        {
            host:     Config.ArweaveHost,
            port:     Config.ArweavePort,
            protocol: Config.ArweaveProto
        }
    );
    return arweave;    
}



async function DisplayArweaveInfo (args)
{
    const arweave = await Init ();

    Sys.VERBOSE ("Fetching network information..");
    Sys.OUT (await arweave.network.getInfo () );

}


async function GetTxData (args)
{
    // No transaction ID given
    if (args.length <= 0)
        Sys.ERR_MISSING_ARG ();

    else
    {
        const tx_id   = args[0];
        const arweave = await Init ();

        arweave.transactions.getData (tx_id, {decode: true} )                
                .then ( data => { process.stdout.write (data) } );

    }
}



module.exports = { Init, DisplayArweaveInfo, GetTxData };