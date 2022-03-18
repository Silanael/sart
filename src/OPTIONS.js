// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2021-12-12_01
//
// SART command-line options.
//

const CONSTANTS     = require ("./CONSTANTS");
const SARTDef       = require ("./SARTDefinition");
const Util          = require ("./Util");
const Sys           = require ("./System");
const ArgDef        = require ("./ArgumentDef");
const SETTINGS      = require ("./SETTINGS").SETTINGS;
const SARTGroup     = require("./SARTGroup");
const LOGLEVELS     = CONSTANTS.LOGLEVELS;
const OUTPUTDESTS   = CONSTANTS.OUTPUTDESTS;
const OUTPUTFORMATS = CONSTANTS.OUTPUTFORMATS;



class Option extends ArgDef
{
        
    WithSetting (key, value = null)
    {
        this.Key   = key;
        this.Value = value;

        if (value == null)
            this.HasParameter = true;

        return this;
    }
 
}



const OPTIONS = new SARTGroup
(    
    new Option ("--no-msg"          ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.NOMSG),  
    new Option ("--msg"             ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.MSG),    
    new Option ("--informative"     ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.MSG),    
    new Option ("--verbose"         ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.VERBOSE).WithAlias ("-V"),
    new Option ("--quiet"           ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.QUIET),  
    new Option ("--debug"           ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.DEBUG),  
    new Option ("--msg-out"         ),//.WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.MsgOut, Util.StrToFlags (a, OUTPUTDESTS) ) } ),
    new Option ("--err-out"         ),//.WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.ErrOut, Util.StrToFlags (a, OUTPUTDESTS) ) } ),
    new Option ("--stderr"          ),//.WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.MsgOut, OUTPUTDESTS.STDERR);  
                                       //                              if (conf.GetSetting (SETTINGS.LogLevel) != LOGLEVELS.MSG) 
                                        //                                 conf.SetSetting (SETTINGS.LogLevel,    LOGLEVELS.MSG) } ),
    new Option ("--msg-stderr"      ).WithInvoke ("--stderr", "--msg"),
    new Option ("--verbose-stderr"  ).WithInvoke ("--stderr", "--verbose"),
    new Option ("--debug-stderr"    ).WithInvoke ("--stderr", "--debug"),
    new Option ("--no-ansi"         ).WithSetting (SETTINGS.ANSIAllowed, false),  
    new Option ("--display-all"     ).WithSetting (SETTINGS.DisplayAll,  true ).WithAlias ("-a"),    
    new Option ("--recursive"       ).WithSetting (SETTINGS.Recursive,   true ).WithAlias ("-r"),        
    new Option ("--host"            ).WithSetting (SETTINGS.ArweaveHost),
    new Option ("--port"            ).WithSetting (SETTINGS.ArweavePort), 
    new Option ("--proto"           ).WithSetting (SETTINGS.ArweaveProto),
    new Option ("--timeout-ms"      ).WithSetting (SETTINGS.ArweaveTimeout_ms),
    new Option ("--concurrent-ms"   ).WithUnderWork (),
    new Option ("--retries"         ).WithUnderWork (),
    new Option ("--retry-ms"        ).WithUnderWork (),
    new Option ("--fast"            ).WithUnderWork (),
    new Option ("--force"           ).WithSetting   (SETTINGS.Force, true),
    new Option ("--less-filters"    ).WithUnderWork (),
    new Option ("--config-file"     ).WithUnderWork (),
    new Option ("--config"          ).WithUnderWork (),
    new Option ("--min-block"       ).WithSetting (SETTINGS.QueryMinBlockHeight),
    new Option ("--max-block"       ).WithSetting (SETTINGS.QueryMaxBlockHeight),
    new Option ("--fields"          ).WithSetting (SETTINGS.OutputFields).WithAlias ("-F"),
    new Option ("--format"          ).WithSetting (SETTINGS.OutputFormat),
    new Option ("--csv"             ).WithSetting (SETTINGS.OutputFormat, OUTPUTFORMATS.CSV), 
    new Option ("--json"            ).WithSetting (SETTINGS.OutputFormat, OUTPUTFORMATS.JSON),
    new Option ("--output-file"     ).WithSetting (SETTINGS.OutputFilename),
    new Option ("--table"           ).WithSetting (SETTINGS.OutputAsTable, true ).WithAliases ("-t", "--tbl"),
    new Option ("--separate"        ).WithSetting (SETTINGS.OutputAsTable, false).WithAliases ("-s", "--sep"),
    
);
Object.freeze (OPTIONS);

/*
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
/*
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

*/



module.exports = { Option, OPTIONS }