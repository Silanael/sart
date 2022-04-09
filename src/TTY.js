const Sys  = require ("./System");
const Util = require ("./Util");


let ProgressIndicatorActive = false;
let AnimFrame  = 0;
let Result_STR = null;
let ProgressIndicatorTask       = null;

const AnimFrames = [ "/", "-", "\\", "|" ];


async function __StartProgressIndicator (settings = {} )
{    
    if (ProgressIndicatorActive)
        return;

    Util.SetMissingMembers (settings, "caption", "PROCESSING...", "delay_ms", 120)

    ProgressIndicatorActive = true;
    AnimFrame               = 0;
    Result_STR              = "";

    if (settings.caption != null)
        Sys.OUT_TXT_RAW (settings.caption + " ");

    Sys.OUT_TXT_RAW (AnimFrames [AnimFrame] + " " );

    while (ProgressIndicatorActive)
    {
        await Util.Delay (settings.delay_ms);

        ++AnimFrame;
        if (AnimFrame >= AnimFrames.length)
            AnimFrame = 0; 

        if (ProgressIndicatorActive)
            Sys.OUT_TXT_RAW ("\b\b" + AnimFrames [AnimFrame] + " ");
    }

    Sys.OUT_TXT_RAW ("\b\b" + Result_STR);
    Sys.OUT_NEWLINE ();

    
}

async function AsyncWithProcessIndicator (settings = { caption : "PROCESSING...", delay_ms : 120 }, ...async_functions)
{
    if (async_functions?.length <= 0)
    {
        Sys.ERR_PROGRAM ("AsyncWithProcessIndicator: No async-functions supplied.");
        return null;
    }

    if (ProgressIndicatorActive || ProgressIndicatorTask != null)
    {
        Sys.ERR_PROGRAM ("Progress indicator already active.");
        return null;
    }

    ProgressIndicatorTask = __StartProgressIndicator (settings); 
    
    const ret = await Promise.race ( [...async_functions, ProgressIndicatorTask] );
    
    StopProgressIndicator (ret != null ? "OK" : "FAILED");
    await ProgressIndicatorTask;

    ProgressIndicatorTask = null;

    return ret;
}

function StopProgressIndicator (result_str = null)
{
    if (result_str != null)
        Result_STR = result_str;

    ProgressIndicatorActive = false;
}


module.exports = { AsyncWithProcessIndicator };