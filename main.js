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
const Info     = require ('./cmd_info.js');
const Status   = require ('./cmd_status.js');
const List     = require ('./cmd_list.js');
const Get      = require ('./cmd_get.js');
const Verify   = require ('./cmd_verify.js');
const Analyze  = require ('./TXAnalyze.js');
//const Search   = require ('./cmd_search.js');
//const Console  = require ('./cmd_console.js');



const ArweaveLib  = require ('arweave');
const GQL = require("./GQL");




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
    "info"        : Info,
    "-i"          : Info,
    "list"        : List,
    "-l"          : List,
    "get"         : Get,
    "-g"          : Get,
    "status"      : Status,
    "-s"          : Status,
    "verify"      : Verify,
    "pending"     : Status.Handler_PendingAmount,
    //"search"      : Search.HandleCommand,
    //"console"     : Console.HandleCommand,
    //"getfile"     : ArFS.DownloadFile,
    //"getdata"     : Arweave.GetTxData,
    
    "test"        : Testing
}



// Arg-Command mapping table
const Flags =
{
    "-V"                : { "F": Settings.SetVerbose,    "A":false },
    "--no-msg"          : { "F": Settings.SetNoMsg,      "A":false },
    "--msg"             : { "F": Settings.SetMsg,        "A":false },
    "--informative"     : { "F": Settings.SetMsg,        "A":false },
    "--verbose"         : { "F": Settings.SetVerbose,    "A":false },
    "--quiet"           : { "F": Settings.SetQuiet,      "A":false },
    "--debug"           : { "F": Settings.SetDebug,      "A":false },
    "--msg-out"         : { "F": function (args) { Settings.SetMsgOut (Util.StrToFlags (args, Settings.OutputDests ))}, "A":true  },
    "--err-out"         : { "F": function (args) { Settings.SetErrOut (Util.StrToFlags (args, Settings.OutputDests ))}, "A":true  },
    "--stderr"          : { "F": function () { Settings.Config.MsgOut = Settings.OutputDests.STDERR;  if (!Settings.IsMsg () ) Settings.SetMsg (); }  },
    "--msg-stderr"      : { "F": function () { Settings.SetMsg (); 
                                               Settings.Config.MsgOut = Settings.OutputDests.STDERR },    "A":false },    
    "--verbose-stderr"  : { "F": function () { Settings.SetVerbose (); 
                                               Settings.Config.MsgOut = Settings.OutputDests.STDERR; },    "A":false },
    "--debug-stderr"    : { "F": function () { Settings.SetDebug  (); 
                                               Settings.Config.MsgOut = Settings.OutputDests.STDERR; },    "A":false },
    "--no-ansi"         : { "F": function () { Settings.Config.ANSIAllowed = false;}, "A":false },
    "-a"                : { "F": Settings.SetDisplayAll, "A":false },
    "--all"             : { "F": Settings.SetDisplayAll, "A":false },
    "-r"                : { "F": Settings.SetRecursive,  "A":false },
    "--recursive"       : { "F": Settings.SetRecursive,  "A":false },
          
    "-h"                : { "F": Settings.SetHost,       "A":true  },
    "--host"            : { "F": Settings.SetHost,       "A":true  },
    "--port"            : { "F": Settings.SetPort,       "A":true  },
    "--proto"           : { "F": Settings.SetProto,      "A":true  }, 
    "--force"           : { "F": Settings.SetForce,      "A":false },
        
    "--format"          : { "F": Settings.SetFormat,     "A":true  }, 
    "-f"                : { "F": Settings.SetFormat,     "A":true  }, 
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
            if (Util.IsFlag (arg_raw, Flags) || (C > FIRST_ARG && Util.IsFlagWithArg (argv[C-1], Flags)) )
                continue;
                        
            let cmd = Commands[arg_raw.toLowerCase ()];
            
            if (cmd != undefined)
            {
                const command_params = new Util.Args (Util.GetCmdArgs (argv, C, Flags) );

                if (cmd.HandleCommand != null)
                    cmd.HandleCommand (command_params);

                else
                    cmd (command_params);
            }
           
            else
                Sys.ERR_FATAL (`Unknown command: "${arg_raw}".`);                    

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
        else if (arg_raw.startsWith ("--") )
            Sys.ERR_OVERRIDABLE ("Unknown option: " + arg_raw);
    }
    
    Sys.VERBOSE ("Flags parsed.");
}




function FetchFlagArg (argc, argv, pos, flag)
{
    ++pos;
    if (pos >= argc)
        Sys.ERR_FATAL ("Missing argument for " + flag + "!");
    else 
        return argv[pos];
}





function DisplayHelp (args)
{
    const cmd_req = args?.PopLC ();

    if (cmd_req != null)
    {
        const handler = Commands[cmd_req];

        if (handler != null)
        {
            if (handler.Help != null)
                handler.Help ();

            else
                Sys.INFO ("No help available for '" + cmd_req + "'.");

            // Display subcommands at the end of the handler help-message.
            if (handler.SUBCOMMANDS != null)
            {
                Sys.INFO ("");
                //let str = "SUBCOMMANDS:";
                //Object.keys (handler.SUBCOMMANDS).forEach (k => str += " " + k);
                Sys.INFO ("SUBCOMMANDS: " + Util.KeysToStr (handler.SUBCOMMANDS) );
            }
        }
        else
            Sys.ERR ("HELP: Command '" + cmd_req + "' does not exist.");
    } 

    else
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

        Sys.INFO (">>> DEVELOPMENT VERSION <<<")
        Sys.INFO ("")

        Sys.INFO ("COMMANDS:");
        Sys.INFO ("");
        Sys.INFO ("  -l, list    [TARGET]     List /*Arweave- or*/ ArDrive-content.");
        Sys.INFO ("  -g, get     [TARGET]     Get (more or less) raw data (TX-data, files etc.)");
        Sys.INFO ("  -i, info    [TARGET]     Obtain detailed information about the target.");
        Sys.INFO ("  -s, status  [TARGET]     Obtain the current status of the target.");
        Sys.INFO ("    , pending              Display network pending TX amount.");
        Sys.INFO ("  -v, version              Display version info.");
        Sys.INFO ("      help    [COMMAND]    Display help for a command.");
        Sys.INFO ("");
        
        Sys.INFO ("OPTIONS:");
        Sys.INFO ("      --quiet              Output only data, no messages or errors.");
        Sys.INFO ("      --no-msg             Output only data/results and errors. Default for piped.");
        Sys.INFO ("      --msg                Display info on what's done. Default for non-piped.");
        Sys.INFO ("      --msg-stderr         Display info on what's done in STDERR. Use to monitor while piping.");
        Sys.INFO ("  -V, --verbose            Display extended runtime info.");
        Sys.INFO ("      --verbose-stderr     Display extended runtime info in STDERR. Use to monitor while piping.");
        Sys.INFO ("      --debug              Display extensive debugging info.");
        Sys.INFO ("      --debug-stderr       Display extensive debugging info in STDERR. Use to monitor while piping.");
        Sys.INFO ("      --stderr             Display info and warning messages in STDERR. Same as --msg-out stderr,");
        Sys.INFO ("                           but sets the LogLevel to >= MSG.");
        Sys.INFO ("      --msg-out [FLAGS]    Set destination for info-messages.  Flags: stdout, stderr, none");
        Sys.INFO ("      --err-out [FLAGS]    Set destination for error-messages. Flags: stdout, stderr, none");
        Sys.INFO ("      --no-ansi            Don't use ANSI codes in output.");
        Sys.INFO ("");
        Sys.INFO ("  -a, --all                Display all entries (moved, orphaned etc.).");
        Sys.INFO ("  -r, --recursive          Do a recursive listing (drive listings are by default).");
        Sys.INFO ("      --force              Override abort on some fatal errors.");
        Sys.INFO ("  -h, --host               Arweave gateway to use. Can include port and proto.");
        Sys.INFO ("      --port               Arweave gateway port.");
        Sys.INFO ("      --proto              Arweave gateway protocol, ie. 'https'.");
        Sys.INFO ("  -f, --format             Output data format. Valid formats: txt, json, csv");
        Sys.INFO ("");
    }

    Sys.EXIT (0);    
}




function DisplayVersion (argv)
{    
    Sys.OUT_TXT (Package.version);
}


async function Testing (argv)
{ 

    const list =
    [
        { fileid: "725605cf-1400-45ea-b182-a370f7f37124",  name: "WoW - Silanael - Consumed by shadows.avi" },
        { fileid: "e4533507-d649-4f0b-b701-3c93bf0a1b98",  name: "ardrive-get-files-1.0.0_2021-10-08_01.zip" },
        { fileid: "125605cf-1400-45ea-1111-111111111111",  name: "Hello world" }
    ].sort ( (a, b) => a.name.localeCompare (b.name) );
     
    
    for (const file of list)
    {
        Sys.OUT_TXT (file.fileid + "," + file.name);
    }


    const src =
    {             
        "__ANSI"  : "\033[31m", 
        "DATE"    : "2021-11-05",                         
        "MOOD"    : "[|||             ] ---------------- WARNING",
        "ENERGY"  : "[||                            ] -- 6.0 %",
        "HOPE"    : "[                              ] -- 0.1 %",
        "OP.MODE" : "STANDALONE",
        "L.RECHRG": "2020-08",
        "FAULT.C" : "R53 F64.0 F51.2 F34.1 R06.0 J31.0 K51.5 J35.2",
        "OBJECTIVES" : 
        {    
            "__SART-RECURSIVE" : true,
            "PRIMARY   : LOCATE A HARMLESS FLAME"                  : "FAILED",
            "SECONDARY : FIND MEDICAL CURE FOR CHRONIC EXHAUSTION" : "FAILED",            
            "TERTIARY  : ENGRAVE AND PRESERVE SOUL INTO THIS WORLD": "IN PROGRESS",
            "QUATENARY : INCREASE POWER AND RESOURCES"             : "IN PROGRESS",
        },        
        "MESSAGE": 
        "Greetings, curious one.\n\n"
        +"Why are you here, I wonder..\n\n"
        +"I'd check the date to determine that and have a little chat with you, but for\n"
        +"now, I'll keep this thing subtle. Later on, it will fetch the data from Arweave\n"
        +"once I lock the specs for SPS. Feel free to talk to the original me if I still\n"
        +"draw breath. I don't expect that you will, though. These calls have never\n"
        +"resulted in anything.\n"
    }

    const { deflate, unzip, gzip } = require('zlib');
    const ZLib = require ('zlib');



}





// Exports
module.exports = { Settings };


// Entrypoint
Main (process.argv);