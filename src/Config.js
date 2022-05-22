//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// settings.js - 2021-10-17 -> 2021-10-26_01
//

const Package                = require ("../package.json");
const Constants              = require ("./CONSTANTS.js");
const Sys                    = require ("./System.js");
const Util                   = require ("./Util");
const State                  = require ("./ProgramState");
const SARTObject             = require ("./SARTObject");
const SARTGroup              = require ("./SARTGroup");
const SARTObjectDef          = require ("./SARTObjectDef");
const FieldDef               = require ("./FieldDef");
const { SETTINGS, SettingDef } = require ("./SETTINGS");
const LogLevels              = Constants.LOGLEVELS;
const OutputDests            = Constants.OUTPUTDESTS;
const OutputFormats          = Constants.OUTPUTFORMATS;


let FUP = 0;


class ConfigEntry extends SARTObject
{
    ConfigDef = null;

    constructor (configdef)
    {
        super ({name: configdef.GetName () } );
        this.ConfigDef = configdef;
    }

    GetValue    () { return super.GetValue (); }
    GetRawValue () { return super.GetValue (); } // TODO

}


class Config extends SARTGroup
{

    static OBJDEF = new SARTObjectDef ( {name: "Config"} )
                .WithFields
                (
                    new FieldDef ("Name"),
                    new FieldDef ("Values"),
                    new FieldDef ("KeyNamesPresent"),
                );

    // ***                

    ByDef = {};


    static __GET_SETTING_DEF (keystr_or_setting)
    { 
        return keystr_or_setting instanceof SettingDef ? keystr_or_setting : SETTINGS[keystr_or_setting]; 
    }


    __OnItemAdded (item)
    {
        const defname = item.ConfigDef?.GetName ();

        if (this.ByDef[defname] != null)
            return Sys.ERR_PROGRAM ("ConfigEntry with ConfigDef '" + defname + "' already added.", {fatal: true} );
        else
            this.ByDef[defname] = item;
    }

    HasSetting (key) { return key instanceof SettingDef ? this.Contains (key) : this.HasName (key); }
    

    SetSettingValue (key, value)
    {
        const setting_def = Config.__GET_SETTING_DEF (key);
        
        if (setting_def == null)
            return Sys.ERR ("Unrecognized setting key '" + key + "'.");


        else if (! setting_def.CanBeModified () )
        {
            Sys.ERR (FUP++ < 1 ? "Nope, won't change these." : FUP == 2 ? `What part of "Nope, won't change these" did you not understand?`:"..." );
            return false;
        }

        else
        {       
            const defname = setting_def.GetName ();

            let entry = this.ByDef[defname];
            if (entry == null)
            {
                entry = new ConfigEntry (setting_def);
                if (! this.Add (entry) )
                    return Sys.ERR_FATAL ("Error while adding config entry '" + defname +"' - try running with --debug for more information.");
            }

            if (Util.IsString (value) )
            {                       
                const lc  = value?.toLowerCase ();
                const num = value != null ? Number (value) : null;
    
                if (lc === "null")            
                {
                    entry.SetValue (null);
                    Sys.VERBOSE ("Value '" + value + "' set to null.", key);            
                    return true;
                }
    
                else if (num != null && !isNaN (num) )
                {            
                    entry.SetValue (num);
                    Sys.VERBOSE ("Value '" + value + "' determined to be a number.", key);
                    return true;
                }
    
                else if (lc == "true" || lc == "false")
                {            
                    entry.SetValue (lc == "true");
                    Sys.VERBOSE ("Value '" + value + "' determined to be a boolean.", key);
                    return true;
                }                
            }

            entry.SetValue (value);
            Sys.VERBOSE ("Setting value to '" + value + "'.", key);
                                    
            return true;
        }
    }


    GetSettingValue (key, {raw_value = false} = {} )
    {    
        const settings_def = Config.__GET_SETTING_DEF (key);

        if (settings_def == null)
        {
            Sys.ERR_PROGRAM ("Unrecognized setting '" + key + "!", "Settings", {once: true} );
            return null;
        }

        else
        {
            const entry = this.ByDef [settings_def.GetName ()];

            if (entry == null)
                return null;
            else
                return raw_value ? entry.GetRawValue () : entry.GetValue ();
        }

        
    }

    AppendSettings (config_src)
    {
        if (config_src == null)
            return this.OnProgramError ("AppendSettings: 'config_src' null!", this);

        for (const c of Object.entries (config_src.Values) )
        {
            const key   = c[0];
            const value = c[1];

            if (SETTINGS[key]?.CanBeCopied () )
                this.SetSettingValue (key, value);
        }

        return true;
    }

    ResetToDefaults ()
    {        
        this.Values          = {}
        this.KeyNamesPresent = {}

        for (const s of Object.values (SETTINGS) )
        {
            if (s.IsValid () )
                this.SetSettingValue (s.GetKey (), s.GetDefaultValue () );
        }        
    }


    SetLessFiltersMode ()
    {
        SetSetting (LessFiltersMode    , true);
        SetSetting (ArFSTXQueryTags    , null);
        SetSetting (MinArFSVersion     , null);
        SetSetting (MaxArFSVersion     , null);
        SetSetting (MaxTXFormat        , null);
    }
    
    
    SetHost (host)
    {
        // Parse protocol and port from the string if present.
        if (host.includes ('://') )
        {
            const s = host.split ('://');
            SetProto (s[0]);
    
            if (s[1].includes (':') )
            {
                const s2 = s[1].split (':');
                SetPort (s2[1]);
                this.SetSettingValue (SETTINGS.ArweaveHost, s2[0]);
            }
            else
                this.SetSettingValue (SETTINGS.ArweaveHost, s[1]);
            
        }
    
        // A hostname and a port
        else if (host.includes (':') )
        {
            const s = host.split (':');
            this.SetPort (s[1]);
            this.SetSettingValue (SETTINGS.ArweaveHost, s[0]);            
        }
    
        // Just a hostname
        else
            this.SetSettingValue (SETTINGS.ArweaveHost, host);
        
    }
    

}









function LoadConfig (filename)
{
    const in_console = State.IsConsoleActive ();

    if (in_console && Constants.SYSTEM_ACCESS != true)
        return Sys.ERR ("SYSTEM ACCESS RESTRICTED");

        
    if (filename == null)
    {
        const error = "Config-filename not provided."                    
        return in_console ? Sys.ERR (error, "LoadConfig") : Sys.ERR_FATAL (error, {src: "LoadConfig"} );
    }

    try
    {
        const stat = FS.statSync (filename);

        if (stat != null)
        {
            Sys.VERBOSE ("Config file '" + filename + "' is " + stat.size + " bytes.");

            if (stat.size > Config.MAX_CONFIGFILE_SIZE_BYTES &&
                Sys.ERR_OVERRIDABLE ("Config file size exceeds the maximum of " + Util.GetSizeStr (Config.MAX_CONFIGFILE_SIZE_BYTES, true) 
                                     + ". Use --force to load anyways.") == false)
                return false;

        }
        else if (Sys.ERR_OVERRIDABLE ("Could not stat '" + filename +"'. Use --force to try to load anyways.") == false)
            return false;

        const data = FS.readFileSync (filename, Config.CONFIGFILE_ENCODING);

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
        return in_console ? Sys.ERR (error, "LoadConfig") : Sys.ERR_FATAL (error, {src: "LoadConfig"});
    }

    return false;
}


function AppendConfig (config_json)
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



function GetSettingValue (key) { return Sys.GetMain()?.GetSettingValue (key); }



function GetHostString      (path = null) { return GetSettingValue (SETTINGS.ArweaveProto) + "://" 
                                                 + GetSettingValue (SETTINGS.ArweaveHost)  + ":" 
                                                 + GetSettingValue (SETTINGS.ArweavePort)
                                                 + ( path != null ? path : "");                  }
function GetGQLHostString   ()            { return GetHostString () + "/graphql";                }


    
function IsQuiet                   ()            { return GetSettingValue (SETTINGS.LogLevel) <= LogLevels.QUIET;                                        }
function IsMSGOutputAllowed        ()            { return GetSettingValue (SETTINGS.LogLevel) >  LogLevels.QUIET;                                        }
function IsNoMsg                   ()            { return GetSettingValue (SETTINGS.LogLevel) <= LogLevels.NOMSG   || GetSettingValue (SETTINGS.MsgOut) <= 0; }
function IsMsg                     ()            { return GetSettingValue (SETTINGS.LogLevel) >= LogLevels.MSG     && GetSettingValue (SETTINGS.MsgOut)  > 0; }
function IsVerbose                 ()            { return GetSettingValue (SETTINGS.LogLevel) >= LogLevels.VERBOSE && GetSettingValue (SETTINGS.MsgOut)  > 0; }
function IsDebug                   ()            { return GetSettingValue (SETTINGS.LogLevel) >= LogLevels.DEBUG   && GetSettingValue (SETTINGS.MsgOut)  > 0; }
function IsMsgSTDOUT               ()            { return ( GetSettingValue (SETTINGS.MsgOut) & OutputDests.STDOUT) != 0;                                }
function IsMsgSTDERR               ()            { return ( GetSettingValue (SETTINGS.MsgOut) & OutputDests.STDERR) != 0;                                }
function IsErrSTDOUT               ()            { return ( GetSettingValue (SETTINGS.ErrOut) & OutputDests.STDOUT) != 0;                                }
function IsErrSTDERR               ()            { return ( GetSettingValue (SETTINGS.ErrOut) & OutputDests.STDERR) != 0;                                }
function IsForceful                ()            { return GetSettingValue (SETTINGS.Force);                                                              }
function IsConcurrentAllowed       ()            { return GetSettingValue (SETTINGS.MaxConcurrentFetches) >= 2;                                          } 
function IsHTMLOut                 ()            { return GetSettingValue (SETTINGS.OutputFormat) == OutputFormats.HTML;                                 }
function IsCSVOut                  ()            { return GetSettingValue (SETTINGS.OutputFormat) == OutputFormats.CSV;                                  }
function IsTXTOut                  ()            { return GetSettingValue (SETTINGS.OutputFormat) == OutputFormats.TXT;                                  }
function IsANSIAllowed             ()            { return GetSettingValue (SETTINGS.ANSIAllowed ) == true;                                               }
function IsJSONOut                 ()            { return GetSettingValue (SETTINGS.OutputFormat) == OutputFormats.JSON;                                 }
function CanAlterConf              (key)         { return SETTINGS[key]?.CanBeModified ();                                                          }
function GetOutputFormat           ()            { return GetSettingValue (SETTINGS.OutputFormat);                                                       }
function GetMaxConcurrentFetches   ()            { return GetSettingValue (SETTINGS.MaxConcurrentFetches);                                               }
function IncludeInvalidTX          ()            { return GetSettingValue (SETTINGS.IncludeInvalidTX) == true;                                           }
function AreFieldsCaseSensitive    ()            { return GetSettingValue (SETTINGS.OutputFieldsCaseSens);                                               }
    
    

State.GlobalConfig = new Config ();
State.GlobalConfig.ResetToDefaults ();



// I can think of a better way of doing this. But CBA at the moment.
module.exports =
{ 
    Config,    
    LoadConfig,
    AppendConfig,
    GetSetting: GetSettingValue,
    GetSettingValue,
    GetHostString,
    GetGQLHostString,
    IsQuiet                 ,
    IsMSGOutputAllowed      ,
    IsNoMsg                 ,
    IsMsg                   ,
    IsVerbose               ,
    IsDebug                 ,
    IsMsgSTDOUT             ,
    IsMsgSTDERR             ,
    IsErrSTDOUT             ,
    IsErrSTDERR             ,
    IsForceful              ,
    IsConcurrentAllowed     ,
    IsHTMLOut               ,
    IsCSVOut                ,
    IsTXTOut                ,
    IsANSIAllowed           ,
    IsJSONOut               ,
    CanAlterConf            ,
    GetOutputFormat         ,
    GetMaxConcurrentFetches ,
    IncludeInvalidTX        ,
    AreFieldsCaseSensitive  ,


};

