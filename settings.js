//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// settings.js - 2021-10-17 -> 2021-10-26_01
//


// Whether to allow the program to access the system,
// restricting fopen and SYS if set to false.
const SystemAccess = true;

const ConsoleActive = false;


const LogLevels =
{
    QUIET   : 0,
    NOMSG   : 1,
    MSG     : 2,
    VERBOSE : 3,
    DEBUG   : 4
};


const OutputDests =
{
    NONE    : 0,
    STDOUT  : 1,
    STDERR  : 2,
    FILE    : 4,

    BOTH    : 3    
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
    
    LogLevel               : process.stdout.isTTY ? LogLevels.MSG : LogLevels.NOMSG,
    MsgOut                 : OutputDests.STDOUT,
    ErrOut                 : OutputDests.STDERR,
              
    ArweaveHost            : "arweave.net",
    ArweavePort            : 443,
    ArweaveProto           : "https",    
    ManualDest             : false,
          
    Recursive              : false,
    DisplayAll             : false,    
    AllowWildcards         : true,
    ConcurrentDelay_ms     : 50,
      
    OutputFields           : null,
    OutputFormat           : OutputFormats.TXT,
    SizeDigits             : 5,
    VarNamesUppercase      : false,
    ANSIAllowed            : true,
    CSVReplacePeriodWith   : "#!#",

    VerifyDefaultFlags     : "SUMMARY,FAILED,UNKNOWN",
    VerifyDefaultFlags_Num : "SUMMARY,ALL",

    Force                  : false,
      
    MaxArFSMetadataSize    : 1073741824, // 1MB ought to be enough for anybody?
    MaxTXFormat            : 2,
    MinArFSVersion         : 0.11,
    MaxArFSVersion         : 0.11,
    ContainerMode          : false,
  
};




function GetHostString      (path = null) { return Config.ArweaveProto + "://" 
                                                 + Config.ArweaveHost  + ":" 
                                                 + Config.ArweavePort
                                                 + ( path != null ? path : "");                                }
function GetGQLHostString   ()            { return GetHostString () + "/graphql";                              }
function IsQuiet            ()            { return Config.LogLevel <= LogLevels.QUIET;                         }
function IsMSGOutputAllowed ()            { return Config.LogLevel >  LogLevels.QUIET;                         }
function IsNoMsg            ()            { return Config.LogLevel <= LogLevels.NOMSG   || Config.MsgOut <= 0; }
function IsMsg              ()            { return Config.LogLevel >= LogLevels.MSG     && Config.MsgOut  > 0; }
function IsVerbose          ()            { return Config.LogLevel >= LogLevels.VERBOSE && Config.MsgOut  > 0; }
function IsDebug            ()            { return Config.LogLevel >= LogLevels.DEBUG   && Config.MsgOut  > 0; }
function IsMsgSTDOUT        ()            { return (Config.MsgOut & OutputDests.STDOUT) != 0;                  }
function IsMsgSTDERR        ()            { return (Config.MsgOut & OutputDests.STDERR) != 0;                  }
function IsErrSTDOUT        ()            { return (Config.ErrOut & OutputDests.STDOUT) != 0;                  }
function IsErrSTDERR        ()            { return (Config.ErrOut & OutputDests.STDERR) != 0;                  }
function IsForceful         ()            { return Config.Force;                                               }
function IsHTMLOut          ()            { return Config.OutputFormat == OutputFormats.HTML;                  }
function IsCSVOut           ()            { return Config.OutputFormat == OutputFormats.CSV;                   }
function IsTXTOut           ()            { return Config.OutputFormat == OutputFormats.TXT;                   }
function IsANSIAllowed      ()            { return Config.ANSIAllowed  == true;                                }
function IsJSONOut          ()            { return Config.OutputFormat == OutputFormats.JSON;                  }
function SetForce           ()            { Config.Force = true;                                               }
function SetPort            (port)        { Config.ArweavePort  = port;  ManualDest = true;                    }
function SetProto           (proto)       { Config.ArweaveProto = proto; ManualDest = true;                    }
function SetDisplayAll      ()            { Config.DisplayAll   = true;;                                       }
function SetRecursive       ()            { Config.Recursive    = true;;                                       }



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

function SetMsg    ()    { Config.LogLevel = LogLevels.MSG;   }
function SetNoMsg  ()    { Config.LogLevel = LogLevels.NOMSG; }
function SetMsgOut (out) { Config.MsgOut = out; }
function SetErrOut (out) { Config.ErrOut = out; }



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
    OutputDests,
    ConsoleActive, 
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
    IsHTMLOut,
    IsCSVOut,
    IsTXTOut,
    IsJSONOut,
    IsANSIAllowed,
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
    SetDisplayAll,
    SetRecursive,
    SetMsgOut,
    SetErrOut,
};

