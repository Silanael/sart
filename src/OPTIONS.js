// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2021-12-12_01
//
// SART command-line options.
//

const CONSTANTS     = require ("./CONSTANTS");
const ArgDef        = require ("./ArgumentDef");
const SETTINGS      = require ("./SETTINGS").SETTINGS;
const SARTGroup     = require ("./SARTGroup");
const Sys           = require ("./System");

const LOGLEVELS     = CONSTANTS.LOGLEVELS;
const OUTPUTDESTS   = CONSTANTS.OUTPUTDESTS;
const OUTPUTFORMATS = CONSTANTS.OUTPUTFORMATS;


const CAT_OUTPUT   = 0,
      CAT_CONFIG   = 1,
      CAT_REST     = 2;

const CATEGORY_HANDLE_ORDER = [CAT_OUTPUT, CAT_CONFIG, CAT_REST];


class Option extends ArgDef
{
    
    constructor (name = null)
    {
        super (name);

        this.WithIsOptional ();
        this.WithCategory (CAT_REST);
    }


    WithSetting (key, value = null)
    {
        this.Key   = key;
        this.Value = value;

        if (value == null)
            this.HasParameter = true;

        return this;
    }

    GetDefaultValue () { return this.Value; }
    GetSettingKey   () { return this.Key;   }    

    SetToConfig (config, value = null)
    {
        if (config == null)
            return Sys.ERR_PROGRAM ("SetToConfig: 'config' null");
        
        if (value == null)
        {
            value = this.GetDefaultValue ();
            Sys.DEBUG ("Value not provided, using default value '" + value + "'.", {src: this});
        }
        else
            Sys.DEBUG ("Setting to value '" + value + "'.", {src: this});

        debugger;
        config.SetSetting (this.GetSettingKey (), value); 
    }
 
}



class Options extends SARTGroup
{    
    constructor ()
    {
        super ();

        this.With
        (
        new Option ("--no-msg"          ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.NOMSG).WithCategory (CAT_OUTPUT),  
        new Option ("--msg"             ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.MSG).WithCategory (CAT_OUTPUT),    
        new Option ("--informative"     ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.MSG).WithCategory (CAT_OUTPUT),    
        new Option ("--verbose"         ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.VERBOSE).WithCategory (CAT_OUTPUT).WithAlias ("-V"),
        new Option ("--quiet"           ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.QUIET).WithCategory (CAT_OUTPUT),  
        new Option ("--debug"           ).WithSetting (SETTINGS.LogLevel, LOGLEVELS.DEBUG).WithCategory (CAT_OUTPUT),  
        new Option ("--msg-out"         ).WithCategory (CAT_OUTPUT),//.WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.MsgOut, Util.StrToFlags (a, OUTPUTDESTS) ) } ),
        new Option ("--err-out"         ).WithCategory (CAT_OUTPUT),//.WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.ErrOut, Util.StrToFlags (a, OUTPUTDESTS) ) } ),
        new Option ("--stderr"          ).WithCategory (CAT_OUTPUT),//.WithFunc (function (conf, a) { conf.SetSetting (SETTINGS.MsgOut, OUTPUTDESTS.STDERR);  
                                            //                              if (conf.GetSetting (SETTINGS.LogLevel) != LOGLEVELS.MSG) 
                                            //                                 conf.SetSetting (SETTINGS.LogLevel,    LOGLEVELS.MSG) } ),
        new Option ("--msg-stderr"      ).WithCategory (CAT_OUTPUT).WithInvoke ("--stderr", "--msg"),
        new Option ("--verbose-stderr"  ).WithCategory (CAT_OUTPUT).WithInvoke ("--stderr", "--verbose"),
        new Option ("--debug-stderr"    ).WithCategory (CAT_OUTPUT).WithInvoke ("--stderr", "--debug"),
        new Option ("--no-ansi"         ).WithCategory (CAT_OUTPUT).WithSetting (SETTINGS.ANSIAllowed, false),  
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
        new Option ("--config-file"     ).WithCategory (CAT_CONFIG).WithUnderWork (),
        new Option ("--config"          ).WithCategory (CAT_CONFIG).WithUnderWork (),
        new Option ("--min-block"       ).WithSetting (SETTINGS.QueryMinBlockHeight),
        new Option ("--max-block"       ).WithSetting (SETTINGS.QueryMaxBlockHeight),
        new Option ("--fields"          ).WithSetting (SETTINGS.OutputFields).WithAlias ("-F"),
        new Option ("--format"          ).WithSetting (SETTINGS.OutputFormat),
        new Option ("--csv"             ).WithSetting (SETTINGS.OutputFormat, OUTPUTFORMATS.CSV), 
        new Option ("--json"            ).WithSetting (SETTINGS.OutputFormat, OUTPUTFORMATS.JSON),
        new Option ("--output-file"     ).WithSetting (SETTINGS.OutputFilename),
        new Option ("--table"           ).WithSetting (SETTINGS.OutputAsTable, true ).WithAliases ("-t", "--tbl"),
        new Option ("--separate"        ).WithSetting (SETTINGS.OutputAsTable, false).WithAliases ("-s", "--sep"),
        )
    }

    /** Args needs to be an instance of Arguments */
    ProcessArgs (args, dest_config)
    {

        debugger;

        if (args == null || args.ProcessArgGroup == null)
            return Sys.ERR_PROGRAM_ONCE ("PROCESS_ARGS: 'args' not supplied or not an instance of Arguments.", {src: this} );

        if (dest_config == null)
            return Sys.ERR_PROGRAM_ONCE ("PROCESS_ARGS: 'dest_config' null.", {src: this} );
        
        for (const cat of CATEGORY_HANDLE_ORDER)
        {
            if (! this.__ProcessCategory (args, dest_config, cat) )
                return Sys.ERR ("Processing category '" + cat + "' returned false.");

            else
                Sys.DEBUG ("Done processing options-category '" + cat + "'.");
        }

        Sys.DEBUG ("Done processing options.");

        return true;
    }


    __ProcessCategory (args, dest_config, catname)
    {
        Sys.DEBUG ("Processing options-category '" + catname + "'...");
        
        const cat_group = this.GetCategoryGroup (catname);
        
        if (cat_group == null)
            return Sys.ERR_PROGRAM ("Tried to process a non-existent options-category '" + catname + "'");

        return args.ProcessArgGroup (cat_group, (optdef, param) => optdef.SetToConfig (dest_config, param) )
    }
    
};

const OPTIONS = new Options (); Object.freeze (OPTIONS);


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