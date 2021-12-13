//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CMD_Info.js - 2021-10-30_01
// Command 'INFO'
//

// Imports
const Package        = require ('../../package.json');
const State          = require ("../ProgramState.js");
const Sys            = require ('../System.js');
const Constants      = require ("../CONSTANTS");
const Settings       = require ('../Config.js');
const Util           = require ('../Util.js');
const Arweave        = require ('../Arweave/Arweave.js');
const ArFS_DEF       = require ('../ArFS/CONST_ARFS.js');
const ArFSEntity     = require ("../ArFS/ArFSEntity");
const Transaction    = require ("../Arweave/Transaction.js");
const CommandDef     = require ("../CommandDef").CommandDef;


class CMD_Info extends CommandDef
{
    Name          = "INFO";
    MinArgsAmount = 1;

    Subcommands = 
    {
        TX      : new SubCMD_TX,
        ARFS    : new SubCMD_ARFS,
        DRIVE   : null, //async function (args) { return await Handler_ArFS (args, null, ArFS_DEF.ENTITYTYPE_DRIVE);  },
        FILE    : null, //async function (args) { return await Handler_ArFS (args, null, ArFS_DEF.ENTITYTYPE_FILE);   },
        FOLDER  : null, //async function (args) { return await Handler_ArFS (args, null, ArFS_DEF.ENTITYTYPE_FOLDER); },
        CONFIG  : null, //function (args) { Sys.OUT_OBJ (State.Config, {recursive_fields: Settings.RECURSIVE_FIELDS }); },
        SART    : new CommandDef ("SART").WithFunc (null, Handler_SART),
        AUTHOR  : new CommandDef ("AUTHOR").WithFunc (null, Handler_Author),
    };

    GetCustomSubCommand (next_arg_peek)
    {
        if (next_arg_peek == null)
            return false;

        else if (Util.IsArweaveHash (next_arg_peek) )
        {
            Sys.VERBOSE ("Treating '" + next_arg_peek + "' as an Arweave-TXID.");
            return this.Subcommands.TX;
        }

        else if (next_arg_peek.toUpperCase () == "SILANAEL")
            return this.Subcommands.AUTHOR;

    }


    Helplines =
    [
        "----------",
        "INFO USAGE",
        "----------",
        "",
        "Transaction info:",
        "   info <txid> (tags)",
        "",
        "ArFS-entity info:",
        "   info (arfs) [drive/file/folder] <arfs-id>",
        "",
        "Get the current config:",
        "   info config",
        "",
        "Program/author info:",
        "   info [sart/author]",
        "",
        "Arweave-Base64s default to TX, ArFS-IDs are handled by ARFS."
    ];

    async OnExecute (cmd) { return false; }
          OnOutput  (cmd) { Sys.ERR ("Unknown subcommand '" + cmd.Peek () + "'."); }

}




class SubCMD_TX extends CommandDef
{
    MinArgsAmount = 1;
    Name          = "TX";
        
    async OnExecute (cmd)
    {
        if ( ! cmd.RequireAmount (1, "Transaction ID (TXID) required.") )
            return false;
    
        const txid = cmd.Pop ();
        Sys.VERBOSE ("INFO: Processing TXID: " + txid);
            
        if (!Util.IsArweaveHash (txid) )            
            return cmd.OnProgramError ("Not a valid transaction ID: " + txid);
                     
        cmd.Transaction = new Transaction (txid);

        await cmd.Transaction.FetchAll ();
        return true;  
    }

    OnOutput (cmd)
    {
        cmd.Transaction?.Output ();
    }    
}



class SubCMD_ARFS extends CommandDef 
{

    Name          = "ARFS";
    MinArgsAmount = 1;


    async OnExecute (cmd, entity_type = null)
    {
        if (entity_type == null)
        {
            if (! cmd.RequireAmount (2, "Two arguments required: <ENTITY-TYPE> <ARFS-ID>") )
                return false;

            entity_type = cmd.PopLC ();
        }

        const arfs_id = cmd.Pop ();

        if (! Util.IsArFSID (arfs_id) 
            && !cmd.OnOverridableError ("Invalid ArFS-ID: " + arfs_id + " (use --force to proceed anyway)", this, {error_id: Constants.ERROR_IDS.ARFS_ID_INVALID}) )
                return false;

        cmd.Entity = ArFSEntity.GET_ENTITY ( {arfs_id: arfs_id, entity_type:entity_type } ); 

        return await cmd.Entity.FetchAll (); 
    }

    OnDisplay (cmd)
    {
        cmd.Entity?.Output ();
    }
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
        Website:           "www.silanael.com (silanael.x in the future)",
        "E-mail":          "sila@silanael.com",
        "PGP-fingerprint": "FAEF 3FF5 7551 9DD9 8F8C 6150 F3E9 A1F8 5B37 D0FE",
        Arweave:           "zPZe0p1Or5Kc0d7YhpT5kBC-JUPcDzUPJeMz2FdFiy4",
        ArFS:              "a44482fd-592e-45fa-a08a-e526c31b87f1",
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
        VersionName:  Package.versionname,  
        VersionSeries:Package.versionseries,        
        VersionDate:  Package.versiondate,
        VersionCode:  Package.versioncode,      
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

        
    const task = new InfoTask_ArFSEntity ({arfs_id: arfs_id, entity_type: entity_type} );
    await task.Execute ();
   

    if (task.WasSuccessful () )
    {
        Sys.INFO ("");
        Sys.INFO ("(Use STATUS to get " + task.Entity.GetEntityType () + " condition and VERIFY to verify success of uploads. --debug for metadata-JSON.)");
    }

    return true;         
}





module.exports = CMD_Info;