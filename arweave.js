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




function InitArweave ()
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



async function DisplayArweaveInfo ()
{
    const arweave = await InitArweave ();

    Sys.VERBOSE ("Fetching network information..");
    Sys.OUT (await arweave.network.getInfo () );
}



module.exports = { DisplayArweaveInfo };