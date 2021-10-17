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


// External imports
const Arweave = require ('arweave');
const Package = require ("./package.json");


// Local imports
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');





// Constants
const PRG_ARG           = 0;
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;




// Arg-Command mapping table
const Commands =
{    
    "help"        : DisplayHelp,
    "/?"          : DisplayHelp,         // For the Windows-scrubs.
    "/h"          : DisplayHelp,         //
    "version"     : DisplayVersion,    
    "info"        : DisplayArweaveInfo
}



// Arg-Command mapping table
const Flags =
{
    "-V"          : { "F": Settings.SetVerbose,  "A":false },
    "--verbose"   : { "F": Settings.SetVerbose,  "A":false },
    "-q"          : { "F": Settings.SetQuiet,    "A":false },
    "--quiet"     : { "F": Settings.SetQuiet,    "A":false },
    "--help"      : { "F": DisplayHelp,          "A":false },
    "-h"          : { "F": Settings.SetHost,     "A":true  },
    "--host"      : { "F": Settings.SetHost,     "A":true  },
    "--port"      : { "F": Settings.SetPort,     "A":true  },
    "--proto"     : { "F": Settings.SetProto,    "A":true  },
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
            if (IsFlag (arg_raw) || (C > FIRST_ARG && IsFlag (argv[C-1])) )
                continue;
                        
            let cmd = Commands[arg_raw.toLowerCase ()];
            
            if (cmd != undefined)            
                cmd ();
           
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
        if (IsFlag (arg_raw) )
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
}

function FetchFlagArg (argc, argv, pos, flag)
{
    ++pos;
    if (pos >= argc)
        Sys.ERR_FATAL ("Missing argument for " + flag + "!");
    else 
        return argv[pos];
}




function InitArweave ()
{
    Sys.INFO ("Connecting to " + GetHostString () + "...")
    
    const Config = Settings.Config;

    try
    {
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
    catch (err)
    {
        Sys.ERR_FATAL (err);
    }
}



function GetHostString ()
{
    const cfg = Settings.Config;
    return cfg.ArweaveProto + "://" + cfg.ArweaveHost + ":" + cfg.ArweavePort;
}



function IsFlag     (arg)   { return arg.startsWith ('-');                                                                                  }


function DisplayHelp ()
{
    Sys.OUT ("Usage: foo");
    Sys.EXIT (0);
}



function DisplayVersion (argv)
{    
    Sys.OUT (Package.version);
}



async function DisplayArweaveInfo ()
{
    const arweave = await InitArweave ();

    Sys.VERBOSE ("Fetching network information..");
    Sys.OUT (await arweave.network.getInfo () );
}


// Exports
module.exports = { Settings };


// Entrypoint
Main (process.argv);