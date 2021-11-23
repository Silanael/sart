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
const ArFS_DEF     = require('./ArFS_DEF.js');
const Analyze      = require ('./TXAnalyze.js');



const SUBCOMMANDS = 
{
    "tx"     : Handler_TX,
    "arfs"   : Handler_ArFS,
    "drive"  : async function (args) { return await Handler_ArFS (args, ArFS_DEF.ENTITYTYPE_DRIVE);  },
    "file"   : async function (args) { return await Handler_ArFS (args, ArFS_DEF.ENTITYTYPE_FILE);   },
    "folder" : async function (args) { return await Handler_ArFS (args, ArFS_DEF.ENTITYTYPE_FOLDER); },
    
    "sart"   : Handler_SART,
    "author" : Handler_Author,
};


function Help (args)
{
    Sys.INFO ("INFO USAGE");
    Sys.INFO ("----------");
    Sys.INFO ("");
    Sys.INFO ("Transaction info:")
    Sys.INFO ("   info <txid> (tags)");
    Sys.INFO ("");    
    Sys.INFO ("ArFS entity info:")
    Sys.INFO ("   info (arfs) [drive/file/folder] <drive-id>"); 
    Sys.INFO ("");
    Sys.INFO ("Program/author info:")
    Sys.INFO ("   info [sart/author]");
    Sys.INFO ("");    
}



async function HandleCommand (args)
{
    if ( ! args.RequireAmount (1, "Valid targets: " + Util.KeysToStr (SUBCOMMANDS) ) )
        return false;

    const target  = args.Pop ();
    const handler = SUBCOMMANDS[target.toLowerCase () ];

    // Invoke handler if found
    if (handler != null)
    {
        Sys.VERBOSE ("Invoking subcommand-handler for '" + target + "'...");
        await handler (args);
    }


    // Arweave-hash, could be either an address or a transaction.
    else if (Util.IsArweaveHash (target) )
    {        
        // Check for transaction
        const tx = await Arweave.GetTx (target);
        if (tx != null)
        {
            Sys.VERBOSE ("Assuming " + target + " is a TXID.");
            await Handler_TX (args, tx);
        }
        else
            Sys.ERR ("Could not find transaction " + target + ". Address info display not yet implemented.");
    }

    // ArFS-ID.
    else if (Util.IsArFSID (target) )    
    {
        Sys.VERBOSE ("Assuming " + target + " is an ArFS-ID.");
        await DisplayArFSEntity (target, null);
    }
    

    else if (target.toUpperCase () == "SILANAEL")
        await Handler_Author (args);

    else
        return Sys.ERR_ABORT ("Unable to determine what '" + target + "' is.");
  
}




async function Handler_TX (args, tx = null)
{
    info = { };
    info.ItemType = "Transaction";

    if (tx == null)
    {
        if ( ! args.RequireAmount (1, "Transaction ID (TXID) required.") )
            return false;

        const txid = args.Pop ();
        Sys.VERBOSE ("INFO: Processing TXID: " + txid);

        info.TXID = txid;

        if (Util.IsArweaveHash (txid) )
            tx = await Arweave.GetTx (txid);
            
        else
            return Sys.ERR_ABORT ("Not a valid transaction ID: " + txid);
                 
    }
    else
        info.TXID = tx.id;


    // Get status and the actual transaction
    info.State = await Arweave.GetTXStatus (info.TXID);

    if (info.State != null)
        Util.CopyKeysToObj (Arweave.TXStatusToInfo (info.State), info);        

    else
        Sys.ERR ("PROGRAM ERROR: Failed to retrieve TX status object!", info.TXID);


    if (tx == null)
        return Sys.ERR_ABORT ("Could not find transaction '" + info.TXID + "'.");

    

    // Start parsing the transaction        
    info.TXFormat = tx.format;
    

    // Check that we can understand this version.
    if (Settings.Config.MaxTXFormat != null && tx.format > Settings.Config.MaxTXFormat)        
    {
        Sys.ERR ("Transaction format '" + tx.format + "' unsupported. Use --force to override (or increase Config.MaxTXFormat).");
        if (! Settings.IsForceful () )
            return info;
    }
    

    info.Address  = await Arweave.OwnerToAddress (tx.owner);             
    info.LastTX   = tx.last_tx;
    
    if (Util.IsSet (tx.target) )
        info.Target   = tx.target;   
    

    // Tags
    info.TagsAmount = tx.tags?.length > 0 ? tx.tags.length : 0;

    if (info.TagsAmount > 0)
    {
        info.Tags = {}
        Util.DecodeTXTags (tx, info.Tags);

        if (info.Tags[ArFS_DEF.TAG_UNIXTIME] != null)
            info.ReportedDate = Util.GetDate (info.Tags[ArFS_DEF.TAG_UNIXTIME]);
    }


    // Data
    if (tx.data_size != null && tx.data_size > 0)
    {
        info.DataSizeBytes = tx.data_size;            
        info.DataLocation  = tx.data?.length > 0 ? "TX" : "DataRoot";
        
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


    // Further analysis
    info.Description = Analyze.GetTXEntryDescription (GQL.Entry.FromTX (tx, info.Address) );


    // Output
    Sys.OUT_OBJ (info, {recursive_fields: ["Tags", "State", "confirmed"] } );
    

    return true;
}




async function Handler_Author ()
{
    const info =
    {
        "__ANSI":          "\033[31m",
        Name:              "Silanael",
        Description:       "A weary, darkened, shattered soul using its fractured shards to engrave"
                           + "\n                 what remains of it into this world. "
                           + "\n                 A creator and a destroyer. A powerful ally and an enemy to be reckoned with. "
                           + "\n                 A pragmatic idealist. A dark ambassador. A ghost imprisoned in the past.. "
                           + "\n                 A fighter longing for a moment of rest..",
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


async function DisplayArFSEntity (arfs_id, entity_type = null, guessing = false)
{    

    if (! Util.IsArFSID (arfs_id) )
        return Sys.ERR ("Not a valid ArFS-ID: " + arfs_id);


    // Try all entity-types until something returns true.
    else if (entity_type == null)
    {
        let order;
        if (Settings.Config.ArFSEntityTryOrder?.length > 0 && (order = Settings.Config.ArFSEntityTryOrder.split (","))?.length > 0)
        {
            const max_queries = order.length;
            if (max_queries > 1)
            {
                if (++Settings.FUP < 4)
                {
                    Sys.WARN (Sys.ANSIWARNING ("Due to the design-flaws of ArFS, retrieving an entity without knowing its type " 
                              + "may take up to " + max_queries + " queries.\n"
                              +"This adds unnecessary strain on the gateway/node so please use the type parameter instead\n"
                              +"(such as 'drive <drive-id>').") );
                }
                else 
                {                    
                    Sys.ERR (Settings.FUP == 4 ? "Are you blind, ignorant or just a fucking idiot? USE. THE. TYPE. PARAMETERS." : "ERROR: User is garbage.");
                    return;
                }
            }

            for (const et of order)
            {                
                if (await DisplayArFSEntity (arfs_id, et, true) == true)                
                    return true;                
            }
            Sys.ERR ("ArFS-ID " + arfs_id + " not found. (Entity-Types tried: " + order?.toString () + ")."
                     +" Consider using a type parameter (drive, folder or file).");

            return false;
        }
        else
            Sys.ERR ("Config.ArFSEntityTryOrder missing or in bad format (needs to be a string such as 'drive,file,folder' ). ");
    }

    // Fetch with a known Entity-Type.
    else
    {
        const entity = await ArFS.GetArFSEntity (arfs_id, entity_type);

        if (entity != null)
        {     
            await entity.UpdateDetailed (Arweave, true, false);       
           
            Sys.OUT_OBJ (entity.GetInfo (), { recursive_fields: ["History", "Versions", "Content", "Orphans", "Parentless"] } );
            Sys.INFO ("");
            Sys.INFO ("(Use --debug to get the metadata JSON content)");
            return true;
        }
        
        else
        {
            if (guessing)
                Sys.VERBOSE ("ArFS-ID " + arfs_id + " was not of Entity-Type:" + entity_type + " .");
            else
                return Sys.ERR ("Failed to get ArFS-" + entity_type + "-entity for ID '" + arfs_id + "'.");
        }

        return false;
    }
}


async function Handler_ArFS (args, entity_type = null)
{
    if (entity_type == null)
    {
        if (! args.RequireAmount (2, "Entity-Type (" + ArFS_DEF.ARFS_ENTITY_TYPES.toString () +") and ArFS-ID required.") )
            return false;
        
        entity_type = args.PopLC ();

        if ( ! ArFS_DEF.IsValidEntityType (entity_type) && 
             ! Sys.ERR_OVERRIDABLE ("Unknown entity type '" + entity_type + "'. Valid ones: " + ArFS_DEF.ARFS_ENTITY_TYPES.toString() ) )
             return false;
    }
    else
        if (! args.RequireAmount (1, ArFS_DEF.GetIDTag (entity_type) + " required.") )
            return false;

    const entity = await ArFS.UserGetArFSEntity (args.Pop(), entity_type);

    if (entity != null)
    {
        await entity.UpdateDetailed (Arweave, true, false);
           
        Sys.OUT_OBJ (entity.GetInfo (), { recursive_fields: entity.RecursiveFields } );
        Sys.INFO ("");
        Sys.INFO ("(Use --debug to get the metadata JSON content)");
        return true;       
    }

    //return await DisplayArFSEntity (args.Pop (), entity_type);    
}





module.exports = { HandleCommand, Help, SUBCOMMANDS }