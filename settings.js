//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// settings.js - 2021-10-17 -> 2021-10-26_01
//

//const Util             = require("./util.js");


// Whether to allow the program to access the system,
// restricting fopen and SYS if set to false.
const SystemAccess = true;


const LogLevels =
{
    QUIET   : 0,
    NORMAL  : 1,
    VERBOSE : 2,
    DEBUG   : 3
};

const OutputFormats =
{
    TXT     : "txt",
    LIST    : "list",
    CSV     : "csv",
    HTML    : "html",
    JSON    : "json",
}

const Config =
{
    LogLevel         : LogLevels.NORMAL,
        
    ArweaveHost      : "arweave.net",
    ArweavePort      : 443,
    ArweaveProto     : "https",    
    ManualDest       : false,
    
    Recursive        : false,
    DisplayAll       : false,    
    AllowWildcards   : true,

    OutputFields     : null,
    OutputFormat     : OutputFormats.TXT,

    Force            : false,

    MetadataMaxSize  : 1073741824, // 1MB ought to be enough for anybody?
    ContainerMode    : false,

};


function GetHostString      ()      { return Config.ArweaveProto + "://" + Config.ArweaveHost + ":" + Config.ArweavePort; }
function GetGQLHostString   ()      { return GetHostString () + "/graphql";             }
function IsQuiet            ()      { return Config.LogLevel <= LogLevels.QUIET;        }
function IsMSGOutputAllowed ()      { return Config.LogLevel >  LogLevels.QUIET;        }
function IsVerbose          ()      { return Config.LogLevel >= LogLevels.VERBOSE;      }
function IsDebug            ()      { return Config.LogLevel >= LogLevels.DEBUG;        }
function IsForceful         ()      { return Config.Force;                              }
function IsHTMLOut          ()      { return Config.OutputFormat == OutputFormats.HTML; }
function IsCSVOut           ()      { return Config.OutputFormat == OutputFormats.CSV;  }
function IsTXTOut           ()      { return Config.OutputFormat == OutputFormats.TXT;  }
function IsJSONOut          ()      { return Config.OutputFormat == OutputFormats.JSON; }
function SetForce           ()      { Config.Force = true;                              }
function SetPort            (port)  { Config.ArweavePort  = port;  ManualDest = true;   }
function SetProto           (proto) { Config.ArweaveProto = proto; ManualDest = true;   }
function SetDisplayAll      ()      { Config.DisplayAll   = true;;                      }
function SetRecursive       ()      { Config.Recursive    = true;;                      }



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
            Config.ArweaveHost = s2[0];
        }
        else
            Config.ArweaveHost  = s[1];
    }

    // A hostname and a port
    else if (host.includes (':') )
    {
        const s = host.split (':');
        SetPort (s[1])
        Config.ArweaveHost = s[0];
    }

    // Just a hostname
    else
    {
        Config.ArweaveHost = host;
        Config.ManualDest  = true; 
    }
        
    
}


function SetFormat (format)
{    
    //Util.RequireParam (format, "format", "SetFormat");
    const format_upper = format.toUpperCase ();
    
    if (OutputFormats[format_upper] != null)
        Config.OutputFormat = OutputFormats[format_upper];
    
    //else
    //    ERR_FATAL ("Invalid output format: " + format);
}



function SetVerbose ()
{ 
    if (Config.LogLevel > LogLevels.QUIET)
        Config.LogLevel = LogLevels.VERBOSE;

   // else
    //    ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}


function SetQuiet ()
{ 
    if (Config.LogLevel < LogLevels.VERBOSE)
        Config.LogLevel = LogLevels.QUIET;

   // else
     //   ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}

function SetDebug () { Config.LogLevel = LogLevels.DEBUG; }




// I can think of a better way of doing this. But CBA at the moment.
module.exports =
{ 
    Config,
    LogLevels,
    OutputFormats,
    GetHostString,
    GetGQLHostString,
    IsQuiet,
    IsMSGOutputAllowed,
    IsVerbose,
    IsDebug,
    IsForceful,
    IsHTMLOut,
    IsCSVOut,
    IsTXTOut,
    IsJSONOut,
    SetHost,
    SetPort,
    SetProto,
    SetFormat,
    SetVerbose,
    SetQuiet,
    SetDebug,
    SetForce,
    SetDisplayAll,
    SetRecursive
};

