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


// Constants
const FIELD_RECURSIVE    = "__SART-RECURSIVE"
const FIELD_ANSI         = "__ANSI";
const FIELD_VALUE_SPACER = 2;


// Variables
const IsPiped = !process.stdout.isTTY;




function ERR_MISSING_ARG   (msg = null, src = null) { ERR_FATAL ("Missing argument." + (msg != null ? " " + msg : ""), src ); }
function SET_RECURSIVE_OUT (obj)                    { PrintObj.SetRecursive (obj); };




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



// Data output. Non-silenceable.
function OUT_BIN (str)
{
    process.stdout.write (str);    
}



// Data output. Non-silenceable.
function OUT_TXT (str)
{            
    console.log (str);
}


// Data output. Non-silenceable.
function OUT_TXT_RAW (str)
{
    process.stdout.write (str);    
}


function OUT_OBJ (obj, opts = { indent: 0, txt_obj: null} ) 
{

    if (obj == null)
        return false;


    switch (Settings.Config.OutputFormat) 
    {        
        case Settings.OutputFormats.JSON:
            
            if (obj != null)
            {
                try               { OUT_TXT (JSON.stringify (obj) ); }
                catch (exception) { ON_EXCEPTION (exception, "Sys.OUT_OBJ (" + obj?.name + ")"); }
            }
            else
            {
                ERR ("Unable to convert object " + obj + " to JSON - trying to print it as-is:");
                OUT_TXT (obj);
            }            
            break;



        // Text
        default:

            // A crafted object for text output was given,
            // use it instead.
            if (opts.txt_obj != null)
                obj = opts.txt_obj;


            // Get longest field name
            let longest_len = 0;
            Object.entries (obj).forEach
            (e => 
            {
                if (e[0]?.length > longest_len)
                    longest_len = e[0].length;
            });

            // list all
            Object.entries (obj).forEach 
            (e => 
            {       
                const var_str = !Settings.Config.VarNamesUppercase ? e[0] : e[0]?.toUpperCase ();

                const field = e[0];
                const val   = e[1];
                
                // Special control field
                if (field.startsWith ("__") )
                {
                    if (field == FIELD_ANSI)
                        if (Settings.Config.ANSIAllowed == true) 
                            OUT_TXT_RAW (val);                    
                }

                // Value is an object that's set to recursive display
                else if (val != null && val[FIELD_RECURSIVE] == true)
                {
                    OUT_TXT ( (var_str).padStart(opts.indent) + " ".repeat (FIELD_VALUE_SPACER) + "-----" );
                    OUT_OBJ (e[1], { indent: opts.indent + longest_len + FIELD_VALUE_SPACER } )
                }

                // Display the field-value pair.
                else
                {
                    const val_str = val != null ? val.toString () : "-";
                    
                    OUT_TXT (" ".repeat (opts.indent) + var_str?.padEnd (longest_len, " ") 
                            + " ".repeat (FIELD_VALUE_SPACER) + val_str);
                }
            }
            );
            break;
    }

}



// Informative output, ie. for 'help'.
function INFO (str, src)
{            
    if (Settings.IsMsg ())
    {
        const msg = src != null ? src + ": " + str : str;
        if (Settings.IsMsgSTDOUT () ) console.log  (msg);
        if (Settings.IsMsgSTDERR () ) console.warn (msg);
    }
}



// Detailed informative output - needs to be enabled.
function VERBOSE (str, src)
{        
    if (Settings.IsVerbose () )
    {
        const msg = src != null ? src + ": " + str : str;
        if (Settings.IsMsgSTDOUT () ) console.log  (msg);
        if (Settings.IsMsgSTDERR () ) console.warn (msg);
    }
}



// Very extensive output - needs to be enabled.
function DEBUG (str, src)
{        
    if (Settings.IsDebug () )
    {
        const msg = src != null ? src + ": " + str : str;
        if (Settings.IsMsgSTDOUT () ) console.log  (msg);
        if (Settings.IsMsgSTDERR () ) console.warn (msg);        
    }
}



// Warning
function WARN (str, src)
{
    if (!Settings.IsQuiet () )
    {
        const msg = src != null ? src + ": " + str : str;
        if (Settings.IsMsgSTDOUT () ) console.log  (msg);
        if (Settings.IsMsgSTDERR () ) console.warn (msg);        
    }        
}



// Error message output.
function ERR (str, src)
{
    if (!Settings.IsQuiet () )
    {
        const msg = src != null ? src + ": " + str : str;
        if (Settings.IsMsgSTDOUT () ) console.log   (msg);
        if (Settings.IsMsgSTDERR () ) console.error (msg);        
    }
       
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



function ERR_CONFLICT (msg, src)
{
    ERR_FATAL (msg + ". Stop fucking around.", src);    
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
function ERR_FATAL (str, src)
{
    ERR (str, src);
    EXIT (-1);
}



function EXIT (code)
{    
    process.exit (!isNaN (code) ? code : 0);
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
    OUT_TXT_RAW,
    OUT_BIN,
    OUT_OBJ,
    SET_RECURSIVE_OUT,
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
};EXIT