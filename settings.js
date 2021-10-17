//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// settings.js - 2021-10-17_01
//

const LogLevels =
{
    QUIET   : 0,
    NORMAL  : 1,
    VERBOSE : 2,
    DEBUG   : 3
};


const Config =
{
    LogLevel     : LogLevels.NORMAL,
    
    ArweaveHost  : "arweave.net",
    ArweavePort  : 443,
    ArweaveProto : "https",    
    ManualDest   : false,
};


function GetHostString      ()      { return Config.ArweaveProto + "://" + Config.ArweaveHost + ":" + Config.ArweavePort; }
function IsQuiet            ()      { return Config.LogLevel <= LogLevels.QUIET;      }
function IsMSGOutputAllowed ()      { return Config.LogLevel >  LogLevels.QUIET;      }
function IsVerbose          ()      { return Config.LogLevel >= LogLevels.VERBOSE;    }
function IsDebug            ()      { return Config.LogLevel >= LogLevels.DEBUG;      }
function SetPort            (port)  { Config.ArweavePort  = port;  ManualDest = true; }
function SetProto           (proto) { Config.ArweaveProto = proto; ManualDest = true; }



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



function SetVerbose ()
{ 
    if (Config.LogLevel > LogLevels.QUIET)
        Config.LogLevel = LogLevels.VERBOSE;

    else
        Sys.ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}


function SetQuiet ()
{ 
    if (Config.LogLevel < LogLevels.VERBOSE)
        Config.LogLevel = LogLevels.QUIET;

    else
        Sys.ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}

function SetDebug () { Config.LogLevel = LogLevels.DEBUG; }




// I can think of a better way of doing this. But CBA at the moment.
module.exports =
{ 
    Config,
    LogLevels,
    GetHostString,
    IsQuiet,
    IsMSGOutputAllowed,
    IsVerbose,
    IsDebug,
    SetHost,
    SetPort,
    SetProto,
    SetVerbose,
    SetQuiet,
    SetDebug
};

