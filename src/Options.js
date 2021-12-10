// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2021-12-08_01
//
// Command-line option-definitions.
//
const Constants     = require ("./CONSTANTS");
const SARTDef       = require ("./SARTDefinition");
const Util          = require ("./Util");
const Sys           = require ("./System");
const Args          = require ("./Arguments");
const { SETTINGS }  = require ("./CONST_SETTINGS");
const LOGLEVELS     = Constants.LOGLEVELS;
const OUTPUTDESTS   = Constants.OUTPUTDESTS;
const OUTPUTFORMATS = Constants.OUTPUTFORMATS;



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


    HasName (name) { return super.HasName (name, true) || (this.Alias != null && Util.StrCmp (name, this.Alias, false) ); }

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


/** Adds the valid options to the config provided, returning an Arguments-instance containing non-arguments (command and command-parameters). */
function ParseOptions (argv, config)
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
        const invoked = InvokeOptionIfExists (config, w, ++index < len ? argv[index] : null)
        
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



module.exports = { ParseOptions, InvokeOptionIfExists, OPTIONS }