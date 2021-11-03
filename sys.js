//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// sys.js - 2021-10-16_01
// Mostly output-related things.
//

// Local imports
const Settings = require ('./settings.js');


// Variables
const IsPiped = !process.stdout.isTTY;



function ERR_MISSING_ARG (msg = null) { ERR_FATAL ("Missing argument." + (msg != null ? " " + msg : "") ); }



function ErrorHandler (error)
{        
    if (error != undefined)
    {
        DEBUG (error);
        INFO (error);
        let msg = error.code;
        
        // The Error is a string or so.
        if (msg == undefined)
        {
            ERR ("A possible bug in the code - recommend contacting me (sila@silanael.com).");
            msg = error;
        }

        // The error is a Javascript-array-thingy.
        else
        {
            switch (error.code)
            {
                case "ENOTFOUND":    msg = "Host not found.";      break;
                case "ECONNREFUSED": msg = "Connection refused.";  break;
            }
        }

        ERR_FATAL ("ERROR: " + msg);
    }

    else
        ERR_FATAL ("It appears that an error of an unknown nature has occurred.. How curious..");

}



// Data output. Non-silencable.
function OUT_BIN (str)
{
    process.stdout.write (str);    
}



// Data output. Non-silencable.
function OUT_TXT (str)
{            
    console.log (str);
}



// Informative output, ie. for 'help'.
function INFO (str, src)
{            
    if (!Settings.IsQuiet () )
        console.log (src != null ? src + ": " + str : str);
}



// Detailed informative output - needs to be enabled.
function VERBOSE (str, src)
{        
    if (Settings.IsVerbose () )
        console.log (src != null ? src + ": " + str : str);
}



// Very extensive output - needs to be enabled.
function DEBUG (str, src)
{        
    if (Settings.IsDebug () )
        console.log (src != null ? src + ": " + str : str);
}



// Warning
function WARN (str, src)
{
    if (!Settings.IsQuiet () )
        console.warn (src != null ? src + ": " + str : str);    

}



// Error message output.
function ERR (str, src)
{
    if (!Settings.IsQuiet () )
        console.error (src != null ? src + ": " + str : str);

    return false;
}



// An error that can be overridden with --force
function ERR_OVERRIDABLE (str)
{
    ERR (str);

    if (!Settings.IsForceful () )
        EXIT (-1);

    return false;
}



function ERR_CONFLICT (msg)
{
    console.error (msg + ". Stop fucking around.");
    EXIT (-1);
}


// Display the same error only once.
// I'd like to use a hash for the lookup here, but there doesn't
// seem to be a fast built-in method for doing that.
const DISPLAYED_ERRORS = {};
function ERR_ONCE (str, src)
{    
    if (!Settings.IsQuiet () && DISPLAYED_ERRORS[str] == null )
    {
        DISPLAYED_ERRORS [str] = true;
        return ERR (str, src);
    }

    return false;
}



// Error message output + exit.
function ERR_FATAL (str)
{
    ERR (str);
    EXIT (-1);
}



function EXIT (code)
{
    process.exit (code);
}



function ON_EXCEPTION (exception, src = "Something")
{    
    if (exception != null)
    {        
        if (Settings.IsDebug () )
        {            
            DEBUG (src + " caused the following exception:")
            DEBUG (exception);
        }
        if (Settings.IsVerbose () )
            VERBOSE (src + " failed.");
    }
    else
        ERR ("Sys.ON_EXCEPTION: Parameter missing (Caused by " + src + ").");

    return false;
}


module.exports = 
{
    OUT_TXT,
    OUT_BIN,
    INFO,
    VERBOSE,
    DEBUG,
    WARN,
    ERR,
    ERR_OVERRIDABLE,
    ERR_CONFLICT,
    ERR_MISSING_ARG,
    ERR_ONCE,
    ERR_FATAL,
    EXIT,
    ON_EXCEPTION,
    ErrorHandler,
};