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
const Package      = require ('./package.json');



const SUBCOMMANDS = 
{
    "tx"     : Handler_TX,
    "sart"   : Handler_SART,
    "author" : Handler_Author,
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
        Sys.ERR_FATAL ("Unable to determine what '" + target + "' is.");
  
    if (info.Valid)
        Sys.OUT_OBJ (info);
}




async function Handler_TX (args, info, tx = null)
{

    if (tx == null)
    {
        const txid = args.RequireAmount (1, "Possible commands: " + Util.KeysToStr (SUBCOMMANDS) ).Pop ();
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

    // Check that we can understand this version.
    if (tx.format > Settings.Config.MaxTXFormat)        
    {
        Sys.ERR ("Transaction format '" + tx.format + "' unsupported. Use --force to override.");
        if (! Settings.IsForceful () )
            return info;
    }
    

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
        info.TransferFrom     = info.Address;
        info.TransferTo       = info.Target;
        info.TransferQTY      = tx.quantity;
        info.TransferQTY_AR   = Arweave.QuantityToAR (tx.quantity);

        if (info.Target == null || info.Target == "")
        {
            Sys.ERR ("Transaction " + target + " has quantity set, but no target!");
            info.Errors =  info.Errors != null ? info.Errors : "" + "Quantity set but no target. ";
        }
    }        

    info.Valid = true;
}




async function Handler_Author ()
{
    const info =
    {
        "__ANSI":          "\033[31m",
        Name:              "Silanael",
        Description:       "A weary, darkened, shattered soul using its fractured shards to engrave what remains of it into this world. "
                           + "A creator and a destroyer. A powerful ally and an enemy to be reckoned with. "
                           + "A pragmatic idealist. A dark ambassador. A ghost imprisoned in the past.. "
                           + "A fighter longing for a moment of rest..",
        Properties:        "MtF, sub, dev, preservationist, artistic_spirit, ex-RPer, stalker, ex-drifter",
        Age:               Util.GetAge (),        
        Website:           "www.silanael.com",
        "E-mail":          "sila@silanael.com",
        "PGP-fingerprint": "FAEF 3FF5 7551 9DD9 8F8C 6150 F3E9 A1F8 5B37 D0FE",
        Arweave:           "zPZe0p1Or5Kc0d7YhpT5kBC-JUPcDzUPJeMz2FdFiy4",
        ArDrive:           "a44482fd-592e-45fa-a08a-e526c31b87f1",
        GitHub:            "https://github.com/Silanael",
        DockerHub:         "https://hub.docker.com/u/silanael",
        DeviantArt:        "https://www.deviantart.com/silanael",
        KOII:              "https://koi.rocks/artist/S1m1xFNauSZqxs3lG0mWqa4EYsO7jL29qNHljTADcFE",
        Twitter:           "https://www.twitter.com/silanael",        
        "The Question":    "If you could have anything in the world, what would it be?"      
    }

    Sys.OUT_OBJ (info);
}





async function Handler_SART (args)
{

const description = 
`

SART is my take on writing a terminal tool to interact with the Arweave-network
with built-in ArFS-compatibility written from scratch. The greatest motivation
behind the project was to get reliable information about the state of my
ArDrive-drives, prompted by a prolonged period during which ArDrive's software
wouldn't display all my files. SART was primarily made to be a data-acquisition
utility (a successor to ardrive-get-files) but will be much more than that.

The project also serves as a practice for greater things to come, being my
second JavaScript-endeavour to this date. I sought to create an utility that
would help along with this path, proving me the data I need in the future.

That said, I have quite some visions for SART as well - after this preliminary
release, I'm going to heavily optimize the queries (currently it's slow as hell,
no optimization done whatsoever so far - I just wanted a reliable directory
listing), add a proper Command Interface mode, variable output field support,
proper output file format handlers and an add-on system to allow transaction
handlers to be loaded from JSONs. So many plans, so little energy..

This version is not meant for any serious use. I'm releasing it as a kind of
a milestone, something I can use to verify that the data fetching is working
as intended when I start to optimize the queries and the fetch process.
One could say I'm also releasing it for the sake of historic preservation,
to have something concrete and solid instead of just another commit in
the GIT repository. Other reasons involve allowing people to use its
functionality while I'm developing the improved version.

Another reason is that it is well possible that the SART I've envisioned
may never see the light of day...

- Silanael
  2021-10-31\n`;  

    const info =
    {
        Name:         "Silanael ARweave Tool",
        Acronym:      "SART",
        Version:      Package.version,
        VersionDate:  Package.versiondate,
        VersionName:  Package.codename,
        Author:       "Silanael",
        SizeUnits:    "Binary (1K = 1024 bytes)",
        SizeSource:   "ArFS metadata-JSON",
        Language:     "JavaScript",
        IDE:          "Visual Studio Code / Code OSS v1.60.2",
        Runtime:      "Node.js v16.10.0",
        Dev_SYS:      "Potato-01 MK3",
        Dev_OS:       "Manjaro Linux",
        Dev_Kernel:   "Linux 5.10.70-1-MANJARO x86_64",
        Description:  description        
    }

    Sys.OUT_OBJ (info);

}





module.exports = { HandleCommand, Help, SUBCOMMANDS }