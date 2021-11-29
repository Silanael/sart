//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// sys.js - 2021-10-16_01
// Mostly output-related things.
//

// Local imports
const Constants = require ("./CONST_SART.js");
const Settings  = require ("./Settings.js");
const State     = require ('./ProgramState.js');


// Constants
const FIELD_RECURSIVE    = "__SART-RECURSIVE"
const FIELD_ANSI         = "__ANSI";
const FIELD_VALUE_SPACER = 2;

const ANSI_RED       = "\033[31m";
const ANSI_YELLOW    = "\033[33m";
const ANSI_ERROR     = ANSI_RED;
const ANSI_WARNING   = ANSI_YELLOW;
const ANSI_PENDING   = ANSI_YELLOW;
const ANSI_CLEAR     = "\033[0m";
const ANSI_UNDERLINE = "\033[4m";
const ANSI_BLINK     = "\033[5m";
const ANSI_BLINK_OFF = "\033[25m";

const WARNING_CHR_SEQ_REGEXP = /!!!.+!!!/;





function ERR_MISSING_ARG   (msg = null, src = null) { return ERR_ABORT ("Missing argument." + (msg != null ? " " + msg : ""), src ); }
function SET_RECURSIVE_OUT (obj)                    { PrintObj.SetRecursive (obj);     };
function ANSIRED           (msg = null)             { return ANSI (ANSI_RED    , msg)  };
function ANSIYELLOW        (msg = null)             { return ANSI (ANSI_YELLOW , msg)  };
function ANSIERROR         (msg = null)             { return ANSI (ANSI_ERROR  , msg)  };
function ANSIWARNING       (msg = null)             { return ANSI (ANSI_WARNING, msg)  };
function ANSIPENDING       (msg = null)             { return ANSI (ANSI_PENDING, msg)  };
function ANSICLEAR         (msg = null)             { return ANSI (ANSI_CLEAR  , msg)  };

function ANSI (code, msg = null)
{ 
    if (!Settings.IsANSIAllowed () )
        return msg != null ? msg : "";

    else 
        return msg != null ? code + msg + ANSI_CLEAR : code;    
};



function ErrorHandler (error)
{        
    msg = "???";    

    if (error != null)
    {
        DEBUG (error);
        
        // The Error is an exception
        if (error.code == null)
        {
            ERR ("A possible bug in the code - recommend contacting me (sila@silanael.com).");
            ERR ("To troubleshoot, run SART with the --debug and send the output to me.");            
            ERR_FATAL ("ERROR: " + (error.name != null ? error.name : "UNKNOWN SYSTEM ERROR") );
            return;
        }

        // The error is a Javascript-array-thingy.
        else
        {            
            switch (error.code)
            {
                case "ENOTFOUND":    msg = "Host not found.";                        break;
                case "ECONNREFUSED": msg = "Connection refused.";                    break;
                case "EACCESS":      msg = "Access denied.";                         break;
                case "ETIMEDOUT":    msg = "Operation timeout. Rather unfortunate."; break;
                case "EPIPE":        msg = "Broken pipe.";                           break;
                case "EMFILE":       msg = "Too many files open. Contact the dev.";  break;
                case "ENOENT":       msg = "No such file or directory.";             break;

                default:
                    msg = "ERROR: " + error.code;

                    if (!ERR_OVERRIDABLE (msg + " (Use the --force to ignore.)") )                    
                    {
                        EXIT (-1);
                        return;
                    }
                    break;              
            }
            ERR ("ERROR: " + msg);
            return true;            
        }        
    }
    else
    {
        ERR_FATAL ("It appears that an error of an unknown nature (null) has occurred. How curious..");
    }     

    ERR_FATAL ("UNKNOWN SYSTEM ERROR. HALTING.");
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


function OUT_OBJ (obj, opts = { indent: 0, txt_obj: null, recursive_fields: [], header: true, format:null } ) 
{

    if (obj == null)
        return false;


    // Default values
    if (opts.indent == null)             opts.indent = 0;
    if (opts.recursive_fields == null)   opts.recursive_fields = [];        
    if (opts.header == null)             opts.header = true;

    const conf = State.GetConfig ();
    if (conf == null)
    {
        console.error ("PROGRAM ERROR: Could not get config. Trying to display object still:");
        console.log (obj);
        return false;
    }    
    
    const out_fmt = opts.format != null ? opts.format : Settings.GetOutputFormat ();


    switch (out_fmt) 
    {        
        case Constants.OUTPUTFORMATS.JSON:
       
            try
            { 
                OUT_TXT (JSON.stringify (obj, null, conf?.JSONSpacing) ); 
            }
            catch (exception) 
            { 
                ON_EXCEPTION (exception, "Sys.OUT_OBJ (" + obj?.name + ")"); 
                ERR ("Unable to convert object " + obj + " to JSON - trying to print it as-is:");
                OUT_TXT (obj);                    
            }           
            break;


        case Constants.OUTPUTFORMATS.CSV:


            // Header
            if (opts.header)
            {
                let header = null;
                for (const e of Object.entries (obj) )
                {
                    const var_str = !conf.VarNamesUppercase ? e[0] : e[0]?.toUpperCase ();

                    if (! var_str.startsWith ("__") )
                        header = header != null ? header + "," + var_str : var_str;
                }
                OUT_TXT (header);
            }



            // Data
            let line = null;
            for (const e of Object.entries (obj) )
            {                                
                let val = e[1] != null ? e[1].toString () : "";
                                                
                if (val == "[object Object]") // Too ugly to be listed like this.
                    val = "<OBJECT>";

                val = val.replace (/,/g, conf.CSVReplacePeriodWith);

                line = line != null ? line + "," + val : val;
            }
            OUT_TXT (line);
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
                const var_str = !conf.VarNamesUppercase ? e[0] : e[0]?.toUpperCase ();

                const field = e[0];
                const val   = e[1];
                
                // Special control field
                if (field.startsWith ("__") )
                {
                    if (field == FIELD_ANSI)
                        if (Settings.IsANSIAllowed () == true) 
                            OUT_TXT_RAW (val);                    
                }

                // Value is an object that's set to recursive display
                else if (val != null && (val[FIELD_RECURSIVE] == true || (opts != null && opts.recursive_fields?.includes (field)) ) )
                {
                    OUT_TXT (" ".repeat (opts.indent) + var_str?.padEnd (longest_len, " ") 
                            + " ".repeat (FIELD_VALUE_SPACER) + "-----");
                                 
                    OUT_OBJ (e[1], 
                    { 
                        indent:           opts.indent + longest_len + FIELD_VALUE_SPACER, 
                        recursive_fields: opts.recursive_fields, 
                        header:           opts.header,
                        format:           out_fmt 
                    });
                }

                // Display the field-value pair.
                else
                {
                    let val_str = val != null ? val.toString () : "-";
                    
                    if (val_str == "[object Object]") // Too ugly to be listed like this.
                        val_str = "<OBJECT>";

                    let pos
                    if (Settings.IsANSIAllowed () && (pos = val_str.search (WARNING_CHR_SEQ_REGEXP)) != -1)
                        val_str = ANSIERROR (val_str).replace (/!!!/g, ANSI_BLINK + "!!!" + ANSI_BLINK_OFF);

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
    if (Settings.IsMsg () )
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
        if (Settings.IsMsgSTDOUT () ) console.log   (msg);
        if (Settings.IsMsgSTDERR () ) console.error (msg);        
    }
}



// Warning. Return true if the warning is suppressed.
function WARN (str, src, args = {error_id: null} )
{
    if (!Settings.IsQuiet () )
    {
        const msg = src != null ? src + ": " + str : str;
        if (Settings.IsErrSTDOUT () ) console.log   (ANSIWARNING (msg) );
        if (Settings.IsErrSTDERR () ) console.error (ANSIWARNING (msg) );        
    }
    return false;    
}



// Error message output. Abort on false - return true if error is suppressed.
function ERR (str, src, args = {error_id: null})
{
    if (!Settings.IsQuiet () )
    {
        const msg = src != null ? src + ": " + str : str;
        if (Settings.IsErrSTDOUT () ) console.log   (ANSIERROR (msg) );
        if (Settings.IsErrSTDERR () ) console.error (ANSIERROR (msg) );        
    }       
    return false;
}



// An error that can be overridden with --force
function ERR_OVERRIDABLE (str, src)
{
    if (!Settings.IsForceful () )
        return ERR_ABORT (str, src);

    else
    {
        ERR (str);
        return true;
    }
}



function ERR_CONFLICT (msg, src)
{
    ERR_FATAL (msg + ". Stop fucking around.", src);    
}


function ERR_PROGRAM (msg, src, opts = {once: false} )
{
    if (opts.once)
        ERR_ONCE ("PROGRAM ERROR: " + msg, src);
    else
        ERR ("PROGRAM ERROR: " + msg, src);
}


// Display the same error only once.
// I'd like to use a hash for the lookup here, but there doesn't
// seem to be a fast built-in method for doing that.
const DISPLAYED_ERRORS = {};
function ERR_ONCE (str, src, args = {error_id: null})
{    
    if (!Settings.IsQuiet () && DISPLAYED_ERRORS[str] == null )
    {
        DISPLAYED_ERRORS [str] = true;
        return ERR (str, src, args);
    }

    return false;
}


// Error message output + exit or return false.
function ERR_ABORT (str, src, args = {error_id: null})
{
    ERR (str, src);

    if (!State.IsConsoleActive () )    
        EXIT (-1);

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



function ON_EXCEPTION (exception, src = "Something", subject = null)
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

        if (exception.code != null)
        {
            let msg = "???";

            switch (exception.code)
            {
                case "ENOTFOUND":    msg = "Host not found.";                            break;
                case "ECONNREFUSED": msg = "Connection refused.";                        break;
                case "EACCESS":      msg = "ACCESS DENIED";                              break;
                case "ETIMEDOUT":    msg = "The operation timeouted. How unfortunate.";  break;
                case "EPIPE":        msg = "Broken pipe. Plumbers won't help.";          break;
                case "EMFILE":       msg = "Too many files open. Contact the dev.";      break;
                case "ENOENT":       msg = "No such file or directory.";                 break;

                default:
                    msg = exception.code;                                            
            }

            ERR ("ERROR: " + msg + (subject != null ? " [" + subject + "]" : "") );
        }
    }
    else
        ERR ("Parameter missing (Caused by " + src + ").", "Sys.ON_EXCEPTION");

    return false;
}


module.exports = 
{
    OUT_TXT,
    OUT_TXT_RAW,
    OUT_BIN,
    OUT_OBJ,
    SET_RECURSIVE_OUT,
    ANSI,
    ANSIRED,
    ANSIYELLOW,
    ANSIERROR,
    ANSIWARNING,
    ANSIPENDING,
    ANSICLEAR,
    INFO,
    VERBOSE,
    DEBUG,
    WARN,
    ERR,
    ERR_ABORT,
    ERR_OVERRIDABLE,
    ERR_CONFLICT,
    ERR_PROGRAM,
    ERR_MISSING_ARG,
    ERR_ONCE,
    ERR_FATAL,
    EXIT,
    ON_EXCEPTION,
    ErrorHandler,    
};