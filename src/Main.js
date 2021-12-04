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
const Package   = require ("../package.json");

const Constants = require ("./CONST_SART.js");
const State     = require ("./ProgramState.js");
const Cache     = require ("./Cache");
const Sys       = require ('./System.js');
const Settings  = require ('./Settings.js');
const Arweave   = require ('./Arweave.js');
const ArFS      = require ('./ArFS.js');
const Util      = require ('./Util.js');
const Info      = require ('./Commands/cmd_info.js');
const Status    = require ('./Commands/cmd_status.js');
const List      = require ('./Commands/cmd_list.js');
const Get       = require ('./Commands/cmd_get.js');
const Verify    = require ('./Commands/cmd_verify.js');
const Console   = require ('./Commands/cmd_console.js');
const Analyze   = require ('./TXAnalyze.js');

const GQL       = require ("./GQL/GQLQuery");

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
            Sys.INFO (Util.GetSizeStr (b, true, State.Config.SizeDigits) );

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
    "--msg-out"         : { "F": function (args) { State.Config.SetMsgOut (Util.StrToFlags (args, Constants.OUTPUTDESTS ))}, "A":true  },
    "--err-out"         : { "F": function (args) { State.Config.SetErrOut (Util.StrToFlags (args, Constants.OUTPUTDESTS ))}, "A":true  },
    "--stderr"          : { "F": function () { State.Config.MsgOut = Constants.OUTPUTDESTS.STDERR;  if (!State.Config.IsMsg () ) State.Config.SetMsg (); }  },
    "--msg-stderr"      : { "F": function () { State.Config.SetMsg (); 
                                               State.Config.MsgOut = Constants.OUTPUTDESTS.STDERR },    "A":false },    
    "--verbose-stderr"  : { "F": function () { State.Config.SetVerbose (); 
                                               State.Config.MsgOut = Constants.OUTPUTDESTS.STDERR; },   "A":false },
    "--debug-stderr"    : { "F": function () { State.Config.SetDebug  (); 
                                               State.Config.MsgOut = Constants.OUTPUTDESTS.STDERR; },   "A":false },
    "--no-ansi"         : { "F": function () { State.Config.ANSIAllowed = false;}, "A":false },
    "-a"                : { "F": Settings.SetDisplayAll, "A":false },
    "--all"             : { "F": Settings.SetDisplayAll, "A":false },
    "-r"                : { "F": Settings.SetRecursive,  "A":false },
    "--recursive"       : { "F": Settings.SetRecursive,  "A":false },
          
    "-h"                : { "F": Settings.SetHost,       "A":true  },
    "--host"            : { "F": Settings.SetHost,       "A":true  },
    "--port"            : { "F": Settings.SetPort,       "A":true  },
    "--proto"           : { "F": Settings.SetProto,      "A":true  },
    "--timeout-ms"      : { "F": function (ms) { State.Config.ArweaveTimeout_ms  = ms; }, "A":true },
    "--concurrent-ms"   : { "F": function (ms) { State.Config.ConcurrentDelay_ms = ms; }, "A":true },    
    "--retries"         : { "F": function (n)  { State.Config.ErrorRetries       = n;  }, "A":true },
    "--retry-ms"        : { "F": function (ms) { State.Config.ErrorWaitDelay_ms  = ms; }, "A":true },
    "--fast"            : { "F": function (ms) { State.Config.ConcurrentDelay_ms = 50; }, "A":false},
    "--force"           : { "F": Settings.SetForce,           "A":false },
    "--less-filters"    : { "F": Settings.SetLessFiltersMode, "A":false },
    "--config-file"     : { "F": Handler_LoadConfig,          "A":true  },
    "--config"          : { "F": Settings.AppendConfig,       "A":true  },
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

                if (State.Config.QueryMinBlockHeight != null ||  State.Config.QueryMaxBlockHeight != null)
                Sys.WARN ("Block range override in effect - min:" + State.Config.QueryMinBlockHeight 
                           + " max:" + State.Config.QueryMaxBlockHeight);

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

    return Settings.SetConfigKey (key, value);        
}


function Handler_LoadConfig (arg)
{
    const console_active = State.IsConsoleActive ();
    const success = Settings.LoadConfig (arg);
    
    if (!success && !console_active)
        Sys.EXIT (-1);

    return success;
}





function DisplayVersion (argv)
{    
    Sys.OUT_TXT (Package.version);
}


function DisplayReadme ()
{
    try
    {
        Sys.INFO (FS.readFileSync (__dirname + "/../README.md", "utf-8" ));
    }
    catch (exception)
    {
        Sys.ON_EXCEPTION (exception, "DisplayReadme");
        Sys.ERR ("Couldn't open README.md. How lame is that.");
    }
}

const CONCURRENT = 10;
class ConcTest
{    
    Tasks_Running = [];
    Tasks_Queued  = [];
    __Running     = 0;


    GetActiveTaskAmount () { return this.Tasks_Running.length; }

     AddTask (task)
    {
        const t = new ConcTask (this);
        
        let slot_found = false;
        for (let i = 0; i < CONCURRENT; i++)
        {
            if (this.Tasks_Running[i] == null)
            {
                this.Tasks_Running[i] = t;                
                this.Tasks_Running[i].Task = t.Start (i, null);
                slot_found = true;        
                break;
            }
        }

        if (!slot_found)
        {
            this.Tasks_Queued.push (task);
            Sys.INFO ("Queued a task.");
        }
             
    }

    __GetAwaitList ()
    {
        const pending = [];
        for (let i = 0; i < CONCURRENT; i++)
        {
            if (this.Tasks_Running[i] != null)
                pending.push (this.Tasks_Running[i].Task);
        }
        return pending;      
    }
    
    __OnTaskFinished (slot)
    {
        this.Tasks_Running[slot] = null;        
        --this.__Running;
    }



    async Run ()
    {
        Sys.INFO ("Exec start.");
        
        let await_list;

        while ( (await_list = this.__GetAwaitList () )?.length > 0 )
        {
            Sys.INFO ("Awaiting for " + await_list.length + " entries..");        
            await Promise.race (await_list);

            if (this.Tasks_Queued.length > 0)
                this.AddTask (this.Tasks_Queued.shift () );            
        }
        
        Sys.INFO ("Exec end.");
        Sys.OUT_OBJ (this.Tasks_Running);
        Sys.OUT_OBJ (this.Tasks_Queued);
    }
}

class ConcTask
{       
    Manager = null;     
    Task    = null;

    constructor (manager)
    {
        this.Manager = manager;
    }
    
    async Start (slot, task)
    {   
        Sys.INFO ("Starting in slot " + slot);  
        await new Promise (r => setTimeout (r, Math.random () * 200) );            
        Sys.INFO ("Slot " + slot + " done.");
        this.Manager?.__OnTaskFinished (slot);
    }
}

async function Testing (argv)
{ 
    
    const arfs_entity = require ("./ArFSEntity");
    const entity = arfs_entity.GET_ENTITY ( {entity_type: argv.PopLC (), arfs_id: argv.Pop() } )

    await entity.FetchAll ();    
    entity.Output ();

    
    
/*
    const Manager = new ConcTest ();
    for (let C = 0; C < 10000; C++)
    {
        Manager.AddTask ();
    }

    
    await Manager.Run ();
    Sys.INFO ("Stopped waiting.");
*/
}





// Exports
module.exports = { Settings };


// Set an exception handler
process.on ("uncaughtException", Sys.ErrorHandler);
    

// Entrypoint
Console.SetMain (Main);
//Cache.CREATE ();

Main (process.argv);