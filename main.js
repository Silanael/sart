#!/usr/bin/env node 
//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// (I'm great at naming things, I know)
//
// main.js - 2021-10-16_01
//


// Imports
const Package  = require ("./package.json");
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Arweave  = require ('./arweave.js');
const ArFS     = require ('./ArFS.js');
const Util     = require ('./util.js');
const List     = require ('./cmd_list.js');
const Search   = require ('./cmd_search.js');
const Console  = require ('./cmd_console.js');





// Constants
const PRG_ARG           = 0;
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;




// Arg-Command mapping table
const Commands =
{    
    "help"        : DisplayHelp,
    "--help"      : DisplayHelp,
    "/?"          : DisplayHelp,         // For the Windows-scrubs.
    "/h"          : DisplayHelp,         //
    "version"     : DisplayVersion,        
    "-v"          : DisplayVersion,    
    "--version"   : DisplayVersion,
    "info"        : Arweave.DisplayArweaveInfo,
    "list"        : List.HandleCommand,
    "search"      : Search.HandleCommand,
    "console"     : Console.HandleCommand,
    "getfile"     : ArFS.DownloadFile,
    "getdata"     : Arweave.GetTxData,
    "test"        : Testing
}



// Arg-Command mapping table
const Flags =
{
    "-V"          : { "F": Settings.SetVerbose,  "A":false },
    "--verbose"   : { "F": Settings.SetVerbose,  "A":false },    
    "--quiet"     : { "F": Settings.SetQuiet,    "A":false },
    "--debug"     : { "F": Settings.SetDebug,    "A":false },
    
    "-h"          : { "F": Settings.SetHost,     "A":true  },        
    "--host"      : { "F": Settings.SetHost,     "A":true  },    
    "--port"      : { "F": Settings.SetPort,     "A":true  },
    "--proto"     : { "F": Settings.SetProto,    "A":true  }, 
    "--force"     : { "F": Settings.SetForce,    "A":false },

    "--format"    : { "F": Settings.SetFormat,   "A":true  }, 
    "-f"          : { "F": Settings.SetFormat,   "A":true  }, 
}






function Main (argv)
{

    // Set an exception handler
    process.on ("uncaughtException", Sys.ErrorHandler);
    

    const argc           = argv.length;
    let   command_found  = false;
    


    // We have some command-line parameters
    if (argc >= FIRST_ARG)
    {    
        // Parse flags first
        ParseFlags (argc, argv);


        // Seek for the command
        for (let C = FIRST_ARG; C < argc; ++C)
        {
            let arg_raw = argv[C];
                
            
            // Ignore flags and flag parameters
            if (Util.IsFlag (arg_raw, Flags) || (C > FIRST_ARG && Util.IsFlag (argv[C-1], Flags)) )
                continue;
                        
            let cmd = Commands[arg_raw.toLowerCase ()];
            
            if (cmd != undefined)            
                cmd (Util.GetCmdArgs (argv, C, Flags) );
           
            else
                Sys.ERR_FATAL (`Unknown command: "${arg}".`);                    

            // Process only one command.
            command_found = true;
            break;
        }
    }

    if (!command_found)
        DisplayHelp ();

}



function ParseFlags (argc, argv)
{

    for (let C = FIRST_ARG; C < argc; ++C)
    {    
        let arg_raw  = argv[C];    

        // Only process flags.
        if (Util.IsFlag (arg_raw, Flags) )
        {
            let arg = arg_raw.startsWith ("--") ? arg_raw.toLowerCase () 
                                                : arg_raw;

            const entry = Flags[arg];
                
            if (entry != undefined)           
            {
                // Takes a parameter
                if (entry.A)
                {
                    entry.F (FetchFlagArg (argc, argv, C, arg_raw) );
                    ++C; // Skip over the flag-arg
                }
                else
                    entry.F ();
            }

            else
                Sys.ERR_FATAL ("Unknown argument: " + arg_raw);

        }
    }
    
    Sys.DEBUG ("Flags parsed.");
}

function FetchFlagArg (argc, argv, pos, flag)
{
    ++pos;
    if (pos >= argc)
        Sys.ERR_FATAL ("Missing argument for " + flag + "!");
    else 
        return argv[pos];
}





function DisplayHelp ()
{
    const headerstr     = "Silanael ARweave Tool";
    const versionstring = Util.GetVersionStr ();

    const longestlen = headerstr.length > versionstring.length ? headerstr.length 
                                                               : versionstring.length;
    const linelen = longestlen + 4;

    Sys.INFO ("".padStart (linelen,   "#"));
    Sys.INFO ("# " + headerstr    .padEnd (longestlen, " ") + " #");
    Sys.INFO ("# " + versionstring.padEnd (longestlen, " ") + " #");    
    Sys.INFO ("".padStart (linelen,   "#"));    
    Sys.INFO ("");
    Sys.INFO ("Usage: sart [OPTION] [COMMAND] [PARAM]");
    Sys.INFO ("");
    
    Sys.INFO ("COMMANDS:");
    Sys.INFO ("");
    Sys.INFO ("  -l, list    [TARGET]     List Arweave- or ArDrive-content.");    
    Sys.INFO ("  -v, version              Display version info.");
    Sys.INFO ("      help    [COMMAND]    Display help for a command.");
    Sys.INFO ("");
    
    Sys.INFO ("OPTIONS:");
    Sys.INFO ("      --quiet              Output only data to stdout.");
    Sys.INFO ("  -V, --verbose            Display extended runtime info.");
    Sys.INFO ("      --debug              Display extensive runtime info.");
    Sys.INFO ("      --force              Override exit on some errors.");
    Sys.INFO ("  -h, --host               Arweave gateway to use. Can include port and proto.");
    Sys.INFO ("      --port               Arweave gateway port.");
    Sys.INFO ("      --proto              Arweave gateway protocol, ie. 'https'.");
    Sys.INFO ("  -f, --format             Output data format. May be 'txt' or 'html'.");
    Sys.INFO ("");

    Sys.EXIT (0);
}




function DisplayVersion (argv)
{    
    Sys.OUT_TXT (Package.version);
}


async function Testing (argv)
{
    Util.RequireArgs (argv, 1);
    const arfs_url = new ArFS.ArFSURL (argv[0]);
    
    if (arfs_url.IsValid () )
    {        
        const drive = new ArFS.ArFSDrive  (arfs_url.DriveID);
        await drive.Init ();
        Sys.INFO (drive); 
    }
}



// Exports
module.exports = { Settings };


// Entrypoint
Main (process.argv);