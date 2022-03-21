const Sys  = require ("./System");
const Util = require ("./Util");


let ProcessIndicatorRunning = false;
let AnimFrame = 0;

const AnimFrames = [ "/", "-", "\\", "|" ];

async function ProcessIndicator (caption = "PROCESSING...", delay_ms = 120)
{    
    if (ProcessIndicatorRunning)
        return;

    ProcessIndicatorRunning = true;
    AnimFrame = 0;

    if (caption != null)
        Sys.OUT_TXT_RAW (caption + " ");

    Sys.OUT_TXT_RAW (AnimFrames [AnimFrame] + " " );

    while (ProcessIndicatorRunning)
    {
        await Util.Delay (delay_ms);

        ++AnimFrame;
        if (AnimFrame >= AnimFrames.length)
            AnimFrame = 0; 

        Sys.OUT_TXT_RAW ("\b\b" + AnimFrames [AnimFrame] + " ");
        
    }
}


module.exports = { ProcessIndicator };