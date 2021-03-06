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
const Console  = require ('./cmd_console.js');
const GQL      = require ("./GQL");


const ArweaveLib  = require ('arweave');
const FS          = require ("fs");






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
    "connect"     : Arweave.Connect,
    "list"        : List,
    "-l"          : List,
    "get"         : Get,
    "-g"          : Get,
    "status"      : Status,
    "-s"          : Status,
    "verify"      : Verify,
    "pending"     : Status.Handler_PendingAmount,
    "console"     : Console,
    "exit"        : Sys.EXIT,
    "quit"        : Sys.EXIT,
    "set"         : SetSetting,
    "date"        : function (args)
    { 
        const unixtime = args.GetAmount () >= 1 ? Number (args.Pop() ) : null;
        if (unixtime != null && isNaN (unixtime) )
            return Sys.ERR ("Not a number. Give an unix-time in seconds since 1970-01-01 00:00:00.");
        else
            Sys.INFO (Util.GetDate (unixtime) + " local, " + Util.GetDate (unixtime, null, true) + " UTC." ); return true; 
    },
    "size"        : function (args)
    {         
        if (!args.RequireAmount (1, "Amount of bytes required.") )
            return false;

        const b = Number (args.Pop () );

        if (isNaN (b) )
            return Sys.ERR ("Not a number.");
        else
            Sys.INFO (Util.GetSizeStr (b, true, Settings.Config.SizeDigits) );

        return true;
    },    
    "readme"      : DisplayReadme,
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
                                               Settings.Config.MsgOut = Settings.OutputDests.STDERR; },   "A":false },
    "--debug-stderr"    : { "F": function () { Settings.SetDebug  (); 
                                               Settings.Config.MsgOut = Settings.OutputDests.STDERR; },   "A":false },
    "--no-ansi"         : { "F": function () { Settings.Config.ANSIAllowed = false;}, "A":false },
    "-a"                : { "F": Settings.SetDisplayAll, "A":false },
    "--all"             : { "F": Settings.SetDisplayAll, "A":false },
    "-r"                : { "F": Settings.SetRecursive,  "A":false },
    "--recursive"       : { "F": Settings.SetRecursive,  "A":false },
          
    "-h"                : { "F": Settings.SetHost,       "A":true  },
    "--host"            : { "F": Settings.SetHost,       "A":true  },
    "--port"            : { "F": Settings.SetPort,       "A":true  },
    "--proto"           : { "F": Settings.SetProto,      "A":true  },
    "--timeout-ms"      : { "F": function (ms) { Settings.Config.ArweaveTimeout_ms  = ms; }, "A":true },
    "--concurrent-ms"   : { "F": function (ms) { Settings.Config.ConcurrentDelay_ms = ms; }, "A":true },    
    "--retries"         : { "F": function (n)  { Settings.Config.ErrorRetries       = n;  }, "A":true },
    "--retry-ms"        : { "F": function (ms) { Settings.Config.ErrorWaitDelay_ms  = ms; }, "A":true },
    "--fast"            : { "F": function (ms) { Settings.Config.ConcurrentDelay_ms = 50; }, "A":false},
    "--force"           : { "F": Settings.SetForce,           "A":false },
    "--less-filters"    : { "F": Settings.SetLessFiltersMode, "A":false },
    "--config-file"     : { "F": Handler_LoadConfig,          "A":true  },
    "--config"          : { "F": Handler_AppendConfig,        "A":true  },
    "--min-block"       : { "F": Settings.SetMinBlockHeight,  "A":true  },
    "--max-block"       : { "F": Settings.SetMaxBlockHeight,  "A":true  },
    "--format"          : { "F": Settings.SetFormat,          "A":true  }, 
    "-f"                : { "F": Settings.SetFormat,          "A":true  }, 
}



async function Main (argv)
{

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

                if (Settings.Config.QueryMinBlockHeight != null ||  Settings.Config.QueryMaxBlockHeight != null)
                Sys.WARN ("Block range override in effect - min:" + Settings.Config.QueryMinBlockHeight 
                           + " max:" + Settings.Config.QueryMaxBlockHeight);

                if (cmd.HandleCommand != null)
                    await cmd.HandleCommand (command_params);

                else
                    await cmd (command_params);
            }
           
            else
                return Sys.ERR_ABORT (`Unknown command: "${arg_raw}".`);                    

            // Process only one command.
            command_found = true;
            break;
        }
    }

    if (!command_found)
        await Console.HandleCommand ();

}




function ParseFlags (argc, argv)
{

    for (let C = FIRST_ARG; C < argc; ++C)
    {    
        let arg_raw   = argv[C];
        let arg_lower = arg_raw?.toLowerCase ();   

        // Only process flags.
        if (Util.IsFlag (arg_raw, Flags) )
        {
            let arg = arg_raw.startsWith ("--") ? arg_lower
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
                return Sys.ERR_ABORT ("Unknown argument: " + arg_raw);

        }

        else if (arg_raw.startsWith ("--") && Commands[arg_lower] == null && ! Sys.ERR_OVERRIDABLE ("Unknown option: " + arg_raw) )
            return false;
            
    }
    
    Sys.VERBOSE ("Flags parsed.", "MAIN");
}




function FetchFlagArg (argc, argv, pos, flag)
{
    ++pos;

    if (pos >= argc)
    {
        Sys.ERR_ABORT ("Missing argument for " + flag + "!");
        return null;
    }
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
                Sys.ERR ("No help available for '" + cmd_req + "'.");

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
        Sys.INFO ("      verify               Verify that ArFS-files are uploaded correctly.")
        Sys.INFO ("      console              Enter the console. This is the default command.")
        Sys.INFO ("    , pending              Display network pending TX amount.");
        Sys.INFO ("  -v, version              Display version info.");
        Sys.INFO ("      help    [COMMAND]    Display help for a command.");
        Sys.INFO ("      readme               Display a detailed user guide.");
        Sys.INFO ("");
        Sys.INFO ("CONSOLE:");
        Sys.INFO ("");
        Sys.INFO ("      connect [URL]        Connect to an Arweave-node or gateway.")
        Sys.INFO ("      set [CONF] [VALUE]   Set a config key to desired value. Case-sensitive.");
        Sys.INFO ("                           Use 'GET CONFIG' to get a list of config keys and their values.");
        Sys.INFO ("      date (UNIXTIME)      Get the current date or convert UNIX-time to human-readable form.");
        Sys.INFO ("      size [bytes]         Convert amount of bytes to human-readable form (1K = 1024).");
        Sys.INFO ("      exit                 Exit the console.")        
        Sys.INFO ("");
        Sys.INFO ("OPTIONS:");        
        Sys.INFO ("");
        Sys.INFO ("      --config-file [FILE] Load a config file in JSON-format. Can be saved with 'GET CONFIG' > file.");
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
        Sys.INFO ("      --msg-out [FLAGS]    Set destination for info-messages.  Flags: stdout,stderr,none");
        Sys.INFO ("      --err-out [FLAGS]    Set destination for error-messages. Flags: stdout,stderr,none");
        Sys.INFO ("      --no-ansi            Don't use ANSI codes in output.");
        Sys.INFO ("");
        Sys.INFO ("  -a, --all                Display all entries (moved, orphaned etc.).");
        Sys.INFO ("  -r, --recursive          Do a recursive listing (drive listings are by default).");
        Sys.INFO ("      --less-filters       Try to retrieve omitted entries by lowering the search criteria.");
        Sys.INFO ("                           Disables Config.ArFSTXQueryTags + TX- and ArFS-minimum versions.");
        Sys.INFO ("      --force              Override abort on some fatal errors.");
        Sys.INFO ("  -h, --host               Arweave gateway to use. Can include port and proto.");
        Sys.INFO ("      --port               Arweave gateway port.");
        Sys.INFO ("      --proto              Arweave gateway protocol, ie. 'https'.");
        Sys.INFO ("      --timeout-ms         HTTP request timeout. Default is 100000.");
        Sys.INFO ("      --concurrent-ms      Interval between concurrent requests. Default is 200. Increase if issues.");
        Sys.INFO ("      --retry-ms           Delay between retries upon errors. Default is 5000.");
        Sys.INFO ("      --fast               Sets the concurrency-delay to 50ms. May result in failed fetches on");
        Sys.INFO ("                           some connections. No, it won't make the current LIST any faster.");
        Sys.INFO ("      --retries            Amount of retries for failed data fetch per entry. Default is 3.");
        Sys.INFO ("  -f, --format             Output data format. Valid formats: txt, json, csv");
        Sys.INFO ("      --min-block [HEIGHT] Add 'block: { min:[HEIGHT] }' to the GQL-queries.");
        Sys.INFO ("      --max-block [HEIGHT] Add 'block: { max:[HEIGHT] }' to the GQL-queries.");
        Sys.INFO ("                           The current block height is 817872 upon writing this.");
        Sys.INFO ("");
        Sys.INFO ("(Use README to get a more detailed usage instructions)");
    }
     

}


function SetSetting (args)
{

    if (!args.RequireAmount (2, "USAGE: SET config-key value") )
        return false;

    const key   = args.Pop ();
    const value = args.Pop ();

    
    if (Object.keys (Settings.Config)?.includes (key) )
    {

        if (! Settings.CanAlterConf (key) )
        {        
            Sys.ERR (Settings.FUP++ < 1 ? "Nope, won't change these." : Settings.FUP == 2 ? `What part of "Nope, won't change these" did you not understand?`:"..." );
            return false;
        }
    
        const lc = value?.toLowerCase ();
        const num = value != null ? Number (value) : null;

        if (lc === "null")            
        {
            Settings.Config[key] = null;
            Sys.VERBOSE ("Value '" + value + "' set to null.");            
        }

        else if (num != null && !isNaN (num) )
        {            
            Settings.Config[key] = num;
            Sys.VERBOSE ("Value '" + value + "' determined to be a number.");
        }

        else if (lc == "true" || lc == "false")
        {            
            Settings.Config[key] = lc == "true";
            Sys.VERBOSE ("Value '" + value + "' determined to be a boolean.");
        }

        else
        {
            Settings.Config[key] = value;
            Sys.VERBOSE ("Setting value as-is.");
        }

        Sys.INFO (key + " set to " + value + ".");
        return true;
    }
    else
    {
        Sys.ERR ("Config setting '" + key + "' does not exist. This is case-sensitive.");
        return false;    
    }
        
}


function Handler_LoadConfig (arg)
{
    const console_active = Settings.ConsoleActive;
    const success = LoadConfig (arg);
    
    if (!success && !console_active)
        Sys.EXIT (-1);

    return success;
}


function LoadConfig (arg)
{
    const in_console = Settings.ConsoleActive;

    if (in_console && Settings.SystemAccess != true)
        return Sys.ERR ("SYSTEM ACCESS RESTRICTED");


    const filename = arg; //args.Pop ();
        
    if (filename == null)
    {
        const error = "Config-filename not provided."                    
        return in_console ? Sys.ERR (error, "LoadConfig") : Sys.ERR_FATAL (error, "LoadConfig");
    }

    try
    {
        const stat = FS.statSync (filename);

        if (stat != null)
        {
            Sys.VERBOSE ("Config file '" + filename + "' is " + stat.size + " bytes.");

            if (stat.size > Settings.MAX_CONFIGFILE_SIZE_BYTES &&
                Sys.ERR_OVERRIDABLE ("Config file size exceeds the maximum of " + Util.GetSizeStr (Settings.MAX_CONFIGFILE_SIZE_BYTES, true) 
                                     + ". Use --force to load anyways.") == false)
                return false;

        }
        else if (Sys.ERR_OVERRIDABLE ("Could not stat '" + filename +"'. Use --force to try to load anyways.") == false)
            return false;

        const data = FS.readFileSync (filename, Settings.CONFIGFILE_ENCODING);

        if (data != null)
        {
            const json = JSON.parse (data);

            if (json != null)            
                return ApplyConfig (json);            
            else
                Sys.ERR ("Failed to parse config JSON for file '" + filename + "'.");
        }
        else
            return Sys.ERR ("Failed to load config-file '" + filename + "'.");

        

    }
    catch (exception)
    { 
        Sys.ON_EXCEPTION (exception, "LoadConfig: " + filename); 
        const error = "Failed to load config-file '" + filename + "'.";
        return in_console ? Sys.ERR (error, "LoadConfig") : Sys.ERR_FATAL (error, "LoadConfig");
    }

    return false;
}


function Handler_AppendConfig (config_json)
{
    try
    {
        const json = JSON.parse (config_json);

        if (json != null)            
            return ApplyConfig (json);
    }
    catch (exception )
    {
        Sys.ON_EXCEPTION (exception, "Handler_AppendConfig");
        return Sys.ERR (`Failed to parse manual config JSON. Proper way to use: --config '{ "Settings": value }' <-- Note the single-quotes.`);
    }

    return false;
}


function ApplyConfig (config)
{
    if (config != null)
    {
        Settings.SetConfigToDefault ();
        
        for (e of Object.entries (config) )
        {
            const key   = e[0];
            const value = e[1];

            if (Settings.Config.hasOwnProperty (key) )
            {
                Settings.Config[key] = value;
                Sys.VERBOSE ("Setting '" + key + "' set to '" + value + "'. ");
            }
            else            
                Sys.ERR ("Config-key '" + key + "' not recognized and will be omitted.");            
        }
    }
    else
        Sys.ERR ("PROGRAM ERROR: config null", "ApplyConfig");

    return true;
}




function DisplayVersion (argv)
{    
    Sys.OUT_TXT (Package.version);
}


function DisplayReadme ()
{
    try
    {
        Sys.INFO (FS.readFileSync (__dirname + "/README.md", "utf-8" ));
    }
    catch (exception)
    {
        Sys.ON_EXCEPTION (exception, "DisplayReadme");
        Sys.ERR ("Couldn't open README.md. How lame is that.");
    }
}


async function Testing (argv)
{ 
}





// Exports
module.exports = { Settings };


// Set an exception handler
process.on ("uncaughtException", Sys.ErrorHandler);
    

// Entrypoint
Console.SetMain (Main);
Main (process.argv);