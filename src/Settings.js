//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// settings.js - 2021-10-17 -> 2021-10-26_01
//

const Package       = require ("../package.json");
const Constants     = require ("./CONST_SART.js");
const Sys           = require ("./System.js");
const State         = require ("./ProgramState.js");
const LogLevels     = Constants.LOGLEVELS;
const OutputDests   = Constants.OUTPUTDESTS;
const OutputFormats = Constants.OUTPUTFORMATS;


let FUP = 0;



function SetConfigToDefault ()
{
    const ret = State.SetConfigToDefault ();

    if (ret.error != null)
        return Sys.ERR_FATAL ("Error while setting config to defaut: "+ err);
    
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


function ApplyConfig (config)
{
    if (config != null)
    {
        Settings.SetConfigToDefault ();
        
        for (e of Object.entries (config) )
        {
            const key   = e[0];
            const value = e[1];

            if (State.Config.hasOwnProperty (key) )
            {
                State.Config[key] = value;
                Sys.VERBOSE ("Setting '" + key + "' set to '" + value + "'. ");
            }
            else            
                Sys.ERR ("Config-key '" + key + "' not recognized and will be omitted.");            
        }
    }
    else
        Sys.ERR_PROGRAM ("config null", "ApplyConfig");

    return true;
}







function GetHostString      (path = null) { return State.Config.ArweaveProto + "://" 
                                                 + State.Config.ArweaveHost  + ":" 
                                                 + State.Config.ArweavePort
                                                 + ( path != null ? path : "");                                            }
function GetGQLHostString    ()            { return GetHostString () + "/graphql";                                          }
function IsQuiet             ()            { return State.Config.LogLevel <= LogLevels.QUIET;                               }
function IsMSGOutputAllowed  ()            { return State.Config.LogLevel >  LogLevels.QUIET;                               }
function IsNoMsg             ()            { return State.Config.LogLevel <= LogLevels.NOMSG   || State.Config.MsgOut <= 0; }
function IsMsg               ()            { return State.Config.LogLevel >= LogLevels.MSG     && State.Config.MsgOut  > 0; }
function IsVerbose           ()            { return State.Config.LogLevel >= LogLevels.VERBOSE && State.Config.MsgOut  > 0; }
function IsDebug             ()            { return State.Config.LogLevel >= LogLevels.DEBUG   && State.Config.MsgOut  > 0; }
function IsMsgSTDOUT         ()            { return (State.Config.MsgOut & OutputDests.STDOUT) != 0;                        }
function IsMsgSTDERR         ()            { return (State.Config.MsgOut & OutputDests.STDERR) != 0;                        }
function IsErrSTDOUT         ()            { return (State.Config.ErrOut & OutputDests.STDOUT) != 0;                        }
function IsErrSTDERR         ()            { return (State.Config.ErrOut & OutputDests.STDERR) != 0;                        }
function IsForceful          ()            { return State.Config.Force;                                                     }
function IsConcurrentAllowed ()            { return true; } // TODO
function IsHTMLOut           ()            { return State.Config.OutputFormat == OutputFormats.HTML;                        }
function IsCSVOut            ()            { return State.Config.OutputFormat == OutputFormats.CSV;                         }
function IsTXTOut            ()            { return State.Config.OutputFormat == OutputFormats.TXT;                         }
function IsANSIAllowed       ()            { return State.Config.ANSIAllowed  == true;                                      }
function IsJSONOut           ()            { return State.Config.OutputFormat == OutputFormats.JSON;                        }
function SetForce            ()            { State.Config.Force = true;                                                     }
function SetPort             (port)        { State.Config.ArweavePort  = port;  State.Config.ManualDest = true;             }
function SetProto            (proto)       { State.Config.ArweaveProto = proto; State.Config.ManualDest = true;             }
function SetDisplayAll       ()            { State.Config.DisplayAll   = true;                                              }
function SetRecursive        ()            { State.Config.Recursive    = true;                                              }
function CanAlterConf        (field)       { return ! Constants.CONFIG_LOCKED_ITEMS.includes (field);                       }
function GetOutputFormat     ()            { return State.Config.OutputFormat;                                              }
function GetMaxConcurrentConn ()           { return State.Config.MaxConcurrentConnections;                                  }


function SetConfigKey (key, value)
{
    if (Object.keys (State.Config)?.includes (key) )
    {

        if (! CanAlterConf (key) )
        {        
            Sys.ERR (FUP++ < 1 ? "Nope, won't change these." : FUP == 2 ? `What part of "Nope, won't change these" did you not understand?`:"..." );
            return false;
        }
    
        const lc  = value?.toLowerCase ();
        const num = value != null ? Number (value) : null;

        if (lc === "null")            
        {
            State.Config[key] = null;
            Sys.VERBOSE ("Value '" + value + "' set to null.");            
        }

        else if (num != null && !isNaN (num) )
        {            
            State.Config[key] = num;
            Sys.VERBOSE ("Value '" + value + "' determined to be a number.");
        }

        else if (lc == "true" || lc == "false")
        {            
            State.Config[key] = lc == "true";
            Sys.VERBOSE ("Value '" + value + "' determined to be a boolean.");
        }

        else
        {
            State.Config[key] = value;
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




function SetHost (host)
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
            State.Config.ArweaveHost = s2[0];
        }
        else
        State.Config.ArweaveHost  = s[1];
    }

    // A hostname and a port
    else if (host.includes (':') )
    {
        const s = host.split (':');
        SetPort (s[1])
        State.Config.ArweaveHost = s[0];
    }

    // Just a hostname
    else
    {
        State.Config.ArweaveHost = host;
        State.Config.ManualDest  = true; 
    }
        
    
}

function SetLessFiltersMode ()
{
    State.Config.LessFiltersMode    = true;

    State.Config.ArFSTXQueryTags    = null;
    State.Config.MinArFSVersion     = null;
    State.Config.MaxArFSVersion     = null;
    State.Config.MaxTXFormat        = null;
}


function SetMinBlockHeight (height)
{
    if (height == null || height.toLowerCase() == "null" || height == "" || height == 0 || height == "0")
        State.Config.QueryMinBlockHeight = null;

    else if (!isNaN (height) )
        State.Config.QueryMinBlockHeight = height;
}    
    
function SetMaxBlockHeight (height)
{
    if (height == null || height.toLowerCase() == "null" || height == "" || height == 0 || height == "0")
        State.Config.QueryMaxBlockHeight = null;

    else if (!isNaN (height) )
        State.Config.QueryMaxBlockHeight = height;
}    



function SetFormat (format)
{    
    //Util.RequireParam (format, "format", "SetFormat");
    const format_upper = format.toUpperCase ();
    
    if (OutputFormats[format_upper] != null)
        State.Config.OutputFormat = OutputFormats[format_upper];
    
    //else
    //    ERR_FATAL ("Invalid output format: " + format);
}

function SetMsg    ()    { State.Config.LogLevel = LogLevels.MSG;   }
function SetNoMsg  ()    { State.Config.LogLevel = LogLevels.NOMSG; }
function SetMsgOut (out) { State.Config.MsgOut = out; }
function SetErrOut (out) { State.Config.ErrOut = out; }



function SetVerbose ()
{ 
    if (State.Config.LogLevel > LogLevels.QUIET)
        State.Config.LogLevel = LogLevels.VERBOSE;

   // else
    //    ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}


function SetQuiet ()
{ 
    if (State.Config.LogLevel < LogLevels.VERBOSE)
        State.Config.LogLevel = LogLevels.QUIET;

   // else
     //   ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}

function SetDebug () { State.Config.LogLevel = LogLevels.DEBUG; }




SetConfigToDefault ();



// I can think of a better way of doing this. But CBA at the moment.
module.exports =
{ 
    LogLevels,
    OutputFormats,
    OutputDests,
    FUP, 
    GetHostString,
    GetGQLHostString,
    IsMSGOutputAllowed,
    IsQuiet,    
    IsNoMsg,
    IsMsg,    
    IsVerbose,
    IsDebug,
    IsMsgSTDERR, IsMsgSTDOUT,
    IsErrSTDERR, IsErrSTDOUT,
    IsForceful,
    IsConcurrentAllowed,
    IsHTMLOut,
    IsCSVOut,
    IsTXTOut,
    IsJSONOut,
    IsANSIAllowed,
    SetConfigKey,
    SetHost,
    SetPort,
    SetProto,
    SetFormat,
    SetNoMsg,
    SetMsg,
    SetVerbose,
    SetQuiet,
    SetDebug,
    SetForce,
    SetLessFiltersMode,
    SetDisplayAll,
    SetRecursive,
    SetMsgOut,
    SetErrOut,
    SetMinBlockHeight,
    SetMaxBlockHeight,
    CanAlterConf,
    SetConfigToDefault,
    LoadConfig,
    AppendConfig,
    GetOutputFormat,
    GetMaxConcurrentConn
};

