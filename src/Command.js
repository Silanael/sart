// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Command.js - 2021-12-07_01
//
// Base class for a command
//

const Constants     = require ("./CONST_SART");
const SETTINGS      = Constants.SETTINGS;
const SARTObject    = require ("./SARTObject");
const SARTDef       = require ("./SARTDefinition");
const State         = require ("./ProgramState");
const Util          = require ("./Util");
const Sys           = require ("./System");
const Settings      = require ("./Settings");
const Args          = require ("./Arguments");
const LOGLEVELS     = Constants.LOGLEVELS;
const OUTPUTDESTS   = Constants.OUTPUTDESTS;
const OUTPUTFORMATS = Constants.OUTPUTFORMATS;



class CommandHandler extends SARTDef
{    
    MinArgsAmount = 0;
    SubCommands   = {};
    HelpLines     = [];
    ExecFunc      = null;
    OutFunc       = null;
    

    constructor (command_name)
    {
        super (command_name);
    }   


    WithMinArgsAmount     (amount)      { this.MinArgsAmount = amount;              return this; }
    WithFunc              (exec, out)   { this.ExecFunc = exec; this.OutFunc = out; return this; }
    WithHelpLines         (helplines)   { this.HelpLines     = helplines;           return this; }
    WithSubCommands       (subcommands) { this.SubCommands   = subcommands;         return this; }
 
    GetMinArgsAmount      ()            { return this.MinArgsAmount; }
    GetSubCommands        ()            { return this.SubCommands;   }


    DisplayHelp ()
    {
        if (this.HelpLines.length <= 0)
            Sys.ERR ("No help available for command '" + this.GetName () + "'.");

        else for (const l of this.HelpLines)
        {
            Sys.INFO (l);         
        }

        Sys.INFO ("Valid subcommands: " + Util.KeysToStr (this.SubCommands) );
    }

    /* Overrsidable, this implementation does nothing. */
    async OnExecute (command) { if (this.ExecFunc != null) return this.ExecFunc (command); else return Sys.ERR_PROGRAM ("Subclass not overriding Execute!", this); }
    async OnOutput  (command) { if (this.OutFunc  != null) return this.OutFunc  (command); else return Sys.ERR_PROGRAM ("Subclass not overriding Output!",  this); }    
}



class Option extends SARTDef
{
    HasParameter = false;
    SettingKey   = null;
    SettingValue = null;
    Function     = null;
    Alias        = null;
    Invokes      = [];
    Deprecated   = false;
    UnderWork    = false;

    constructor (name)
    {
        super (name);        
    }

    HasName (name) { return super.HasName (name, false) || (this.Alias != null && Util.StrCmp (name, this.Alias, true) ); }

    WithSetting (key, value = null)
    {
        this.SettingKey   = key;
        this.SettingValue = value;

        if (value == null)
            this.HasParameter = true;

        return this;
    }

    WithAlias      (name)             { this.Alias      = name;         return this; }
    WithFunc       (func)             { this.Function   = func;         return this; }
    WithInvoke     (...option_names)  { this.Invokes    = option_names; return this; }
    WithDeprecated ()                 { this.Deprecated = true;         return this; }
    WithUnderWork  ()                 { this.UnderWork  = true;         return this; }
 

    Invoke (config, param)
    {

        if (this.Deprecated)
            return Sys.ERR ("Option deprecated and removed.", this);

        else if (this.UnderWork)
            return Sys.WARN ("This option is not yet ready. Stay tuned.", this);

        else if (this.HasParameter && param == null)
            return Sys.ERR ("Parameter missing.", this);


        else if (this.Function != null)
            this.Function (config, param);


        else if (this.SettingKey != null)
        {
            if (config == null)
                Sys.ERR_PROGRAM ("Invoke: 'config' null!", this);
            
            else if (this.HasParameter)            
                config.SetSetting (this.SettingKey, param);

            else 
                config.SetSetting (this.SettingKey, this.SettingValue);                            
        }

        else
            Sys.ERR_PROGRAM ("Was unable to set option '" + this + "' - no valid actions available.");


        // Invoke all options listed, if any.
        if (this.Invokes.length > 0)
        {
            for (const i of this.Invokes)
            {
                InvokeOptionIfExists (config, param);
            }
        }

    }
}


const COMMANDS =  
{
    "help"        : null,
    "help"        : null,
    "/?"          : null,
    "/h"          : null,
    "version"     : null,
    "-v"          : null,
    "--version"   : null,
    "info"        : null,
    "-i"          : null,
    "connect"     : null,
    "list"        : null,
    "-l"          : null,
    "get"         : null,
    "-g"          : null,
    "status"      : null,
    "-s"          : null,
    "verify"      : null,
    "pending"     : null,
    "console"     : null,
    "exit"        : null,
    "quit"        : null,
    "set"         : null,
    "readme"      : null,
    "test"        : new CommandHandler ("test").WithFunc (function () { return true}, function () { Sys.INFO ("Testing."); } ),
    "date"        : function ()
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
        
};



const OPTIONS =
{    
    "--no-msg"          : new Option ("--no-msg"          ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.NOMSG),  
    "--msg"             : new Option ("--msg"             ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.MSG),    
    "--informative"     : new Option ("--informative"     ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.MSG),    
    "--verbose"         : new Option ("--verbose"         ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.VERBOSE).WithAlias ("-V"),
    "--quiet"           : new Option ("--quiet"           ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.QUIET),  
    "--debug"           : new Option ("--debug"           ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.DEBUG),  
    "--msg-out"         : new Option ("--msg-out"         ).WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.MsgOut, Util.StrToFlags (a, OUTPUTDESTS) ) } ),
    "--err-out"         : new Option ("--err-out"         ).WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.ErrOut, Util.StrToFlags (a, OUTPUTDESTS) ) } ),
    "--stderr"          : new Option ("--stderr"          ).WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.MsgOut, OUTPUTDESTS.STDERR);  
                                                                                           if (conf.GetSetting (SETTINGS.LogLevel) != LOGLEVELS.MSG) 
                                                                                               conf.SetSetting (SETTINGS.LogLevel,    LOGLEVELS.MSG) } ),
    "--msg-stderr"      : new Option ("--msg-stderr"      ).WithInvoke ("--stderr", "--msg"),
    "--verbose-stderr"  : new Option ("--verbose-stderr"  ).WithInvoke ("--stderr", "--verbose"),
    "--debug-stderr"    : new Option ("--debug-stderr"    ).WithInvoke ("--stderr", "--debug"),
    "--no-ansi"         : new Option ("--no-ansi"         ).WithSetting (SETTINGS.ANSIAllowed, false),  
    "-all"              : new Option ("-a"                ).WithSetting (SETTINGS.DisplayAll,  true ).WithAlias ("-a"),    
    "--recursive"       : new Option ("-r"                ).WithSetting (SETTINGS.Recursive,   true ).WithAlias ("-r"),        
    "--host"            : new Option ("--host"            ).WithSetting (SETTINGS.ArweaveHost),
    "--port"            : new Option ("--port"            ).WithSetting (SETTINGS.ArweavePort), 
    "--proto"           : new Option ("--proto"           ).WithSetting (SETTINGS.ArweaveProto),
    "--timeout-ms"      : new Option ("--timeout-ms"      ).WithSetting (SETTINGS.ArweaveTimeout_ms),
    "--concurrent-ms"   : new Option ("--concurrent-ms"   ).WithUnderWork (),
    "--retries"         : new Option ("--retries"         ).WithUnderWork (),
    "--retry-ms"        : new Option ("--retry-ms"        ).WithUnderWork (),
    "--fast"            : new Option ("--fast"            ).WithUnderWork (),
    "--force"           : new Option ("--force"           ).WithSetting   (SETTINGS.Force, true),
    "--less-filters"    : new Option ("--less-filters"    ).WithUnderWork (),
    "--config-file"     : new Option ("--config-file"     ).WithUnderWork (),
    "--config"          : new Option ("--config"          ).WithUnderWork (),
    "--min-block"       : new Option ("--min-block"       ).WithSetting (SETTINGS.QueryMinBlockHeight),
    "--max-block"       : new Option ("--max-block"       ).WithSetting (SETTINGS.QueryMaxBlockHeight),
    "--format"          : new Option ("--format"          ).WithSetting (SETTINGS.OutputFormat),
    "--csv"             : new Option ("--csv"             ).WithSetting (SETTINGS.OutputFormat, OUTPUTFORMATS.CSV), 
    "--json"            : new Option ("--json"            ).WithSetting (SETTINGS.OutputFormat, OUTPUTFORMATS.JSON)
    
}
Object.freeze (OPTIONS);



function InvokeOptionIfExists (config, opt_name, param)
{
    if (config == null)
        return Sys.ERR_PROGRAM ("'config' null!", "InvokeOption");

    for (const o of Object.values (OPTIONS) )
    {
        if (o != null && o.HasName (opt_name) )
        {
            Sys.VERBOSE ("Invoking argument '" + opt_name + "' with " + (param != null ? "parameter '" + param + "'." : "no parameter.") );
            o.Invoke (config, param);
            return o;
        }
    }
}


function GetCommandHandler (name)
{    
    for (const o of Object.values (COMMANDS) )
    {
        if (o != null && o.HasName (name) )
            return o;        
    }
    return null;
}



class Command extends SARTObject
{
    Handler   = null;
    
    Command   = null;    
    Arguments = null;
    ArgV      = null;

    Config    = new Settings.Config;

    StartTime = null;
    EndTime   = null;
    Fetches   = 0;

    Success   = null;
    Failed    = null;
    

    GetConfig          ()       { return this.Config; }

    /** Gets the time the task took. Call after completion. */
    GetDurationMs      ()       { return this.StartTime != null && this.EndTime != null ? this.EndTime - this.StartTime : null }
    GetDurationSec     ()       { return this.GetDurationMs () / 1000; }

    /* Gets the duration if the task is completed, current runtime otherwise. */
    GetRuntimeMs       ()       { return this.StartTime != null ? (this.EndTime != null ? this.EndTime : Util.GetUNIXTimeMS () ) - this.StartTime : null };
    GetRuntimeSec      ()       { return this.GetRuntimeMs () / 1000; }

    IncrementFetchesBy (amount) { this.Fetches += amount;                        }
    GetFetchesAmount   ()       { return this.Fetches != null ? this.Fetches : 0 }
    WasSuccessful      ()       { return this.Success;                           }


    async ExecuteCommand (argv)
    {
        this.Arguments = argv;

        if (argv == null || argv.length <= 0)
            return this.Failed = Sys.ERR_PROGRAM ("ExecuteCommand: 'argv' null!", this);
                    
        this.Arguments = this.ParseOptions (argv);        
        this.Command   = this.Arguments.PopLC ();

        if (this.Command == null)
            return this.Failed = Sys.ERR ("ExecuteCommand: No command given.", this);

        this.Handler = GetCommandHandler (this.Command);

        if (this.Handler == null)
            return this.Failed = Sys.ERR ("Command '" + this.Command + "' not recognized or handler missing.", this);
        
        else
        {
            Sys.VERBOSE ("Executing command '" + this.Command + "'...");
            await this.__DoExecute ();  
        }

    }

    async __DoExecute ()
    {   
        if (this.Handler == null)     
            return this.OnProgramError ("Command-handler not set!", this);

        else if (State.ActiveCommand != null)
            return this.OnError ("A command is already running.");

        else
        {            
            State.ActiveCommand = this;

            this.StartTime = Util.GetUNIXTimeMS ();        
            this.Success = await this.Handler.OnExecute (this);        
            this.EndTime = Util.GetUNIXTimeMS ();        

            this.Handler.OnOutput (this);

            Sys.VERBOSE ("");        
            Sys.VERBOSE ("Command finished in " + this.GetRuntimeSec () + " sec with " + Util.AmountStr (this.Fetches, "fetch", "fetches") + "." );
        } 
    }
      

    ParseOptions (argv)
    {
        if (argv == null)
        {
            Sys.ERR_PROGRAM ("'argv' null!", "Command.ParseOptions");
            return null;
        }

        const len = argv.len;
        let index = 0;
        
        const command_args = [];

        for (const w of argv)
        {
            const invoked = InvokeOptionIfExists (this.Config, w, ++index < len ? argv[index] : null)
            
            if (invoked != null)
            {
                // Skip over the parameter.
                if (invoked.HasParameter)
                    ++index;
            }
            else if (w.startsWith ("--") )            
            {
                Sys.ERR ("Unrecognized option '" + w + "'. Aborting.");
                return null;
            }
                                            
            else
                command_args.push (w);
        }

        return new Args (command_args);
    }        

}






module.exports = { Command, CommandHandler };