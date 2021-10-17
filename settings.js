const Config =
{
    Quiet        : false,
    Verbose      : false,
    
    ArweaveHost  : "arweave.net",
    ArweavePort  : 443,
    ArweaveProto : "https",    
    ManualDest   : false,

}


function SetPort    (port)  { Config.ArweavePort  = port;  ManualDest = true; }
function SetProto   (proto) { Config.ArweaveProto = proto; ManualDest = true;  }



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
    if (!Config.Quiet)
        Config.Verbose  = true;

    else
        Sys.ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}


function SetQuiet ()
{ 
    if (!Config.Verbose)
        Config.Quiet  = true;

    else
        Sys.ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); 
}



module.exports =
{ 
    Config,
    SetHost,
    SetPort,
    SetProto,
    SetVerbose,
    SetQuiet
};