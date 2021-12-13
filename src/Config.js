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
const State                  = require ("./ProgramState.js");
const SARTObject             = require ("./SARTObject");
const { SETTINGS, Setting }  = require ("./SETTINGS");
const LogLevels              = Constants.LOGLEVELS;
const OutputDests            = Constants.OUTPUTDESTS;
const OutputFormats          = Constants.OUTPUTFORMATS;


let FUP = 0;



class Config extends SARTObject
{

    Name            = "Default";
    Values          = {};
    KeyNamesPresent = {};


    HasSetting                (key)         { return this.KeyNamesPresent[key instanceof Setting ? key.GetKey () : key] != null;                         }
    

    

    SetSetting (key, value)
    {
        if (key instanceof Setting)
            key = key.GetKey ();


        if (SETTINGS[key] == null)
            return Sys.ERR ("Unrecognized setting key '" + key + "'.");


        else if (! SETTINGS[key].CanBeModified () )
        {
            Sys.ERR (FUP++ < 1 ? "Nope, won't change these." : FUP == 2 ? `What part of "Nope, won't change these" did you not understand?`:"..." );
            return false;
        }

        else
        {       
            this.KeyNamesPresent [key] = true;

            if (value instanceof String)
            {                       
                const lc  = value?.toLowerCase ();
                const num = value != null ? Number (value) : null;
    
                if (lc === "null")            
                {
                    this.Values[key] = null;
                    Sys.VERBOSE ("Value '" + value + "' set to null.", key);            
                }
    
                else if (num != null && !isNaN (num) )
                {            
                    this.Values[key] = num;
                    Sys.VERBOSE ("Value '" + value + "' determined to be a number.", key);
                }
    
                else if (lc == "true" || lc == "false")
                {            
                    this.Values[key] = lc == "true";
                    Sys.VERBOSE ("Value '" + value + "' determined to be a boolean.", key);
                }                
            }

            this.Values[key] = value;
            Sys.VERBOSE ("Setting value as-is.", key);
                                    
            return true;
        }
    }


    GetSetting (key)
    {    
        if (key instanceof Setting)
            key = key.GetKey ();

        if (SETTINGS[key] == null)
        {
            Sys.ERR_PROGRAM ("Unrecognized setting '" + key + "!", "Settings", {once: true} );
            return null;
        }

        else if (this.HasSetting (key) )            
            return this.Values[key];

        else
            return null;
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
                this.SetSetting (key, value);
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
                this.SetSetting (s.GetKey (), s.GetDefaultValue () );
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
                this.SetSetting (SETTINGS.ArweaveHost, s2[0]);
            }
            else
                this.SetSetting (SETTINGS.ArweaveHost, s[1]);
            
        }
    
        // A hostname and a port
        else if (host.includes (':') )
        {
            const s = host.split (':');
            this.SetPort (s[1]);
            this.SetSetting (SETTINGS.ArweaveHost, s[0]);            
        }
    
        // Just a hostname
        else
            this.SetSetting (SETTINGS.ArweaveHost, host);
        
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
        return in_console ? Sys.ERR (error, "LoadConfig") : Sys.ERR_FATAL (error, "LoadConfig");
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
        return in_console ? Sys.ERR (error, "LoadConfig") : Sys.ERR_FATAL (error, "LoadConfig");
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



function GetSetting (key) { return State.GetSetting (key); }



function GetHostString      (path = null) { return GetSetting (SETTINGS.ArweaveProto) + "://" 
                                                 + GetSetting (SETTINGS.ArweaveHost)  + ":" 
                                                 + GetSetting (SETTINGS.ArweavePort)
                                                 + ( path != null ? path : "");                  }
function GetGQLHostString   ()            { return GetHostString () + "/graphql";                }


    
function IsQuiet                   ()            { return GetSetting (SETTINGS.LogLevel) <= LogLevels.QUIET;                                        }
function IsMSGOutputAllowed        ()            { return GetSetting (SETTINGS.LogLevel) >  LogLevels.QUIET;                                        }
function IsNoMsg                   ()            { return GetSetting (SETTINGS.LogLevel) <= LogLevels.NOMSG   || GetSetting (SETTINGS.MsgOut) <= 0; }
function IsMsg                     ()            { return GetSetting (SETTINGS.LogLevel) >= LogLevels.MSG     && GetSetting (SETTINGS.MsgOut)  > 0; }
function IsVerbose                 ()            { return GetSetting (SETTINGS.LogLevel) >= LogLevels.VERBOSE && GetSetting (SETTINGS.MsgOut)  > 0; }
function IsDebug                   ()            { return GetSetting (SETTINGS.LogLevel) >= LogLevels.DEBUG   && GetSetting (SETTINGS.MsgOut)  > 0; }
function IsMsgSTDOUT               ()            { return ( GetSetting (SETTINGS.MsgOut) & OutputDests.STDOUT) != 0;                                }
function IsMsgSTDERR               ()            { return ( GetSetting (SETTINGS.MsgOut) & OutputDests.STDERR) != 0;                                }
function IsErrSTDOUT               ()            { return ( GetSetting (SETTINGS.ErrOut) & OutputDests.STDOUT) != 0;                                }
function IsErrSTDERR               ()            { return ( GetSetting (SETTINGS.ErrOut) & OutputDests.STDERR) != 0;                                }
function IsForceful                ()            { return GetSetting (SETTINGS.Force);                                                              }
function IsConcurrentAllowed       ()            { return GetSetting (SETTINGS.MaxConcurrentFetches) >= 2;                                          } 
function IsHTMLOut                 ()            { return GetSetting (SETTINGS.OutputFormat) == OutputFormats.HTML;                                 }
function IsCSVOut                  ()            { return GetSetting (SETTINGS.OutputFormat) == OutputFormats.CSV;                                  }
function IsTXTOut                  ()            { return GetSetting (SETTINGS.OutputFormat) == OutputFormats.TXT;                                  }
function IsANSIAllowed             ()            { return GetSetting (SETTINGS.ANSIAllowed ) == true;                                               }
function IsJSONOut                 ()            { return GetSetting (SETTINGS.OutputFormat) == OutputFormats.JSON;                                 }
function CanAlterConf              (key)         { return SETTINGS[key]?.CanBeModified ();                                                          }
function GetOutputFormat           ()            { return GetSetting (SETTINGS.OutputFormat);                                                       }
function GetMaxConcurrentFetches   ()            { return GetSetting (SETTINGS.MaxConcurrentFetches);                                               }
function IncludeInvalidTX          ()            { return GetSetting (SETTINGS.IncludeInvalidTX) == true;                                           }
function AreFieldsCaseSensitive    ()            { return GetSetting (SETTINGS.OutputFieldsCaseSens);                                               }
    
    

State.GlobalConfig = new Config ();
State.GlobalConfig.ResetToDefaults ();



// I can think of a better way of doing this. But CBA at the moment.
module.exports =
{ 
    Config,    
    LoadConfig,
    AppendConfig,
    GetSetting,
    
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

