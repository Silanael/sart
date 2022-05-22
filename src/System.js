//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// sys.js - 2021-10-16_01
// Mostly output-related things.
//

const FS            = require ("fs");
const ReadLine      = require ('readline');

// Local imports
const CONSTANTS     = require ("./CONSTANTS.js");
const LogLevels     = CONSTANTS.LOGLEVELS;
const OutputDests   = CONSTANTS.OUTPUTDESTS;
const OutputFormats = CONSTANTS.OUTPUTFORMATS;
const State         = require ("./ProgramState.js");
const Util          = require ("./Util");




// Constants
const FIELD_RECURSIVE    = "__SART-RECURSIVE"
const FIELD_ANSI         = "__ANSI";
const FIELD_VALUE_SPACER = 2;

const ANSI_ESCAPE        = "\033[";
const ANSICODE_CLEAR     = 0;
const ANSICODE_UNDERLINE = 4;
const ANSICODE_BLINK_ON  = 5;
const ANSICODE_BLINK_OFF = 25;


const ANSI_RED       = "\033[31m";
const ANSI_YELLOW    = "\033[33m";
const ANSI_ERROR     = ANSI_RED;
const ANSI_WARNING   = ANSI_YELLOW;
const ANSI_PENDING   = ANSI_YELLOW;
const ANSI_CLEAR     = "\033[0m";
const ANSI_UNDERLINE = "\033[4m";
const ANSI_BLINK     = "\033[5m";
const ANSI_BLINK_OFF = "\033[25m";
const ANSI_CLEARLINE = "\033[2K\r";

const CHR_NEWLINE    = '\n';

const CHOICESTR_DEFAULT_YES = ["Y/n"];
const CHOICESTR_DEFAULT_NO  = ["y/N"];

const WARNING_CHR_SEQ_REGEXP = /!!!.+!!!/;

var Main     = null;
var Settings = null;

function SetMain                    (main)           { Main = main; Settings = main?.GetSettingDefs (); }
function GetMain                    ()               { return Main; }

function GetSettingVal              (key)            { return Main?.GetSettingValue (key); }

function IsQuiet                    ()               { return GetSettingVal (Settings?.LogLevel) <= LogLevels.QUIET;                                         }
function IsMsg                      ()               { return GetSettingVal (Settings?.LogLevel) >= LogLevels.MSG     && GetSettingVal (Settings?.MsgOut)  > 0; }
function IsVerbose                  ()               { return GetSettingVal (Settings?.LogLevel) >= LogLevels.VERBOSE && GetSettingVal (Settings?.MsgOut)  > 0; }
function IsDebug                    ()               { return GetSettingVal (Settings?.LogLevel) >= LogLevels.DEBUG   && GetSettingVal (Settings?.MsgOut)  > 0; }
function IsMsgSTDOUT                ()               { return ( GetSettingVal (Settings?.MsgOut) & OutputDests.STDOUT) != 0;                                }
function IsMsgSTDERR                ()               { return ( GetSettingVal (Settings?.MsgOut) & OutputDests.STDERR) != 0;                                }
function IsErrSTDOUT                ()               { return ( GetSettingVal (Settings?.ErrOut) & OutputDests.STDOUT) != 0;                                }
function IsErrSTDERR                ()               { return ( GetSettingVal (Settings?.ErrOut) & OutputDests.STDERR) != 0;                                }
function IsForceful                 ()               { return GetSettingVal (Settings?.Force);                                                              }
function IsANSIAllowed              ()               { return GetSettingVal (Settings?.ANSIAllowed ) == true;                                               }
function IsTTY                      ()               { return CONSTANTS.IS_TTY;                                                                         }
function IsProgressIndicatorEnabled ()               { return IsTTY (); /* TODO - Make a config-setting */                                              }
function IsProgressIndicatorActive  ()               { return GetProgressIndicator () != null;                                                          }
function GetActiveCommand           ()               { return GetMain ()?.GetActiveCommand ();                                                          }
function GetProgressIndicator       ()               { return GetActiveCommand ()?.GetProgressIndicator ();                                             }
function IsNoColorEnvVarSet         ()               { return process.env.NO_COLOR != null; }

function ERR_MISSING_ARG    (msg = null, src = null) { return ERR_ABORT ("Missing argument." + (msg != null ? " " + msg : ""), src ); }
function SET_RECURSIVE_OUT  (obj)                    { PrintObj.SetRecursive (obj);     };
function ANSIRED            (msg = null)             { return ANSI (ANSI_RED    , msg)  };
function ANSIYELLOW         (msg = null)             { return ANSI (ANSI_YELLOW , msg)  };
function ANSIERROR          (msg = null)             { return ANSI (ANSI_ERROR  , msg)  };
function ANSIWARNING        (msg = null)             { return ANSI (ANSI_WARNING, msg)  };
function ANSIPENDING        (msg = null)             { return ANSI (ANSI_PENDING, msg)  };
function ANSICLEAR          (msg = null)             { return ANSI (ANSI_CLEAR  , msg)  };
function ANSICODE           (ansicode)               { return ANSI_ESCAPE + ansicode  + "m" };
function ANSISETCOLOR       (ansicolor)              { return ANSI_ESCAPE + ansicolor + "m" };

function ANSI (code, msg = null)
{ 
    if (!IsANSIAllowed () )
        return msg != null ? msg : "";

    else 
        return msg != null ? code + msg + ANSI_CLEAR : code;    
};


async function ReadFile (filename)
{
    return new Promise 
    (
        function (resolve, reject)
        {            
            FS.readFile (filename, (error, data) => 
            {
                if (error != null)
                {
                    ErrorHandler (error, { prefix: "Failed to read file '" + filename + "'" } );                    
                    resolve (null);
                }
                else
                    resolve (data);
            });
                     
        }
    )
}


async function Async (promises = [], {await_all = true} = {} )
{
    if (promises == null || promises.length <= 0)
        return ERR_PROGRAM ("No Promises given.", "Async");

    const amount         = promises.length;
    const max_concurrent = GetSettingVal (Settings?.MaxAsyncCalls);

    if (amount <= max_concurrent)
    {
        DEBUG ("Running " + amount + " promise(s) all in one go (await_all:" + await_all + ")...");
        return await_all == true ? await Promise.all (promises) : await Promise.race (promises);
    }
    
    else
    {
        let processed = 0;
        let results = [];
        while (processed < amount)
        {
            DEBUG ("Running entries " + processed + " to " + (processed + max_concurrent - 1) + " (await_all:" + await_all + ")...");
            const entries = promises.slice (processed, (processed += max_concurrent) );
            results.push (await_all == true ? await Promise.all (entries) : await Promise.race (entries) );
        }

        return results;
    }
    
}

var ErrorHandlerActive = false;

function ErrorHandler (error, msgs = {prefix: null, suffix: null} )
{        
    if (ErrorHandlerActive)
    {
        console.error ("ErrorHandler was called recursively. Aborting execution. The last error: ");
        console.error (error);
        process.exit (-1);
    }

    ErrorHandlerActive = true;
    msg = "???";    
    
    if (error != null)
    {
        DEBUG (error);
        
        // The Error is an exception
        if (error.code == null)
        {
            console.error (error);
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
            ERR ("ERROR: " + (msgs?.prefix != null ? msgs.prefix + ": " : "") + msg + Util.Or (msgs?.suffix, "") );
            ErrorHandlerActive = false;
            return true;            
        }        
    }
    else
    {
        ERR_FATAL ("It appears that an error of an unknown nature (null) has occurred. How curious..");
    }     

    ERR_FATAL ("UNKNOWN SYSTEM ERROR. HALTING.");
}


class OutputDest
{    

    ANSISupported  = true;
    Indicator      = null;
    IndicatorDrawn = false;

    Start          ()         {}    
    OutputLine     (str)      { this.ClearIndicator (); this.__DoOutputLine  (str);  this.DrawIndicator (); }
    OutputChars    (str)      { this.ClearIndicator (); this.__DoOutputChars (str);  this.DrawIndicator (); }
    OutputData     (data)     { this.ClearIndicator (); this.__DoOutputData  (data); this.DrawIndicator (); } 
    NewLine        ()         { this.OutputChars (CHR_NEWLINE);    }
    ClearLine      ()         { if (this.CanUseANSI () ) this.__DoOutputChars (ANSI_CLEARLINE); }
    Done           ()         {}
    CanUseANSI     ()         { return this.ANSISupported && IsANSIAllowed (); }

    HookIndicator   (indicator) { this.Indicator = indicator; this.DrawIndicator (); }
    UnhookIndicator ()          { this.Indicator = null;      this.Newline       (); }    
    
    DrawIndicator   ()
    { 
        if (this.Indicator == null)
            return; 

        else
        {
            this.ClearIndicator (); 
            this.__DoOutputChars (this.Indicator.GetStr () ); 
            this.IndicatorDrawn = true;
        }
    }

    ClearIndicator ()
    { 
        if (this.IndicatorDrawn) 
            this.ClearLine (); 

        this.IndicatorDrawn = false; 
    }


    OutputANSICode (ansicode) 
    {
        if (this.CanUseANSI () ) 
            this.OutputChars (ANSICODE (ansicode) );
    }    
}

class OutputDest_STDOUT extends OutputDest
{
    ANSISupported = true;

    __DoOutputLine (str)
    {
        OUT_TXT_STDOUT (str, true);        
    }
    __DoOutputChars (str)
    {
        OUT_TXT_STDOUT (str, false);        
    }
    __DoOutputData (data)
    {
        OUT_STDOUT (data);        
    }
}


class OutputDest_STDERR extends OutputDest
{
    ANSISupported = true;

    __DoOutputLine (str)
    {
        OUT_TXT_STDERR (str, true);
    }
    __DoOutputChars (str)
    {
        OUT_TXT_STDERR (str, false);        
    }
    __DoOutputData (data)
    {
        OUT_STDERR (data);        
    }   

}


class OutputDest_File extends OutputDest
{
    ANSISupported = false;

    FilePath      = null;
    Mode          = null;
    Encoding      = null;

    OutputStream  = null;


    constructor (file_path, mode = "wx", encoding = "utf-8")
    {
        super ();
        this.FilePath = file_path;
        this.Mode     = mode;
        this.Encoding = encoding;
    }

    IsFileOpened () { return this.OutputStream != null; }

    Start ()
    {
        //if (this.FileHandle != null)
        //    this.FileHandle = FS.openSync (file_path, "wx");

        if (this.OutputStream == null)
            this.OutputStream = FS.createWriteStream 
            (
                this.FilePath,
                {
                    flags:     this.Mode,
                    encoding:  this.Encoding,
                    autoClose: true
                }
            );            
    }
    
    __DoOutputData (data)
    {
        if (! this.IsFileOpened () )
            this.Start ();

        this.OutputStream.write (data);        
    }   

    __DoOutputLine (str)
    {
        this.__DoOutputData (str);        
    }   

    __DoOutputChars (str)
    {
        this.__DoOutputData (str);        
    }   


    __DoOutputANSI (ansi) { }

    Done ()
    {
        if (this.OutputStream != null)
        {
            this.OutputStream.close ();
            this.OutputStream = null;
        }        
    }
}


const OUTPUTDESTS =
{
    STDOUT: new OutputDest_STDOUT (),
    STDERR: new OutputDest_STDERR (),
}

const OUTPUTDESTS_STDOUT = [ OUTPUTDESTS.STDOUT ];
const OUTPUTDESTS_STDERR = [ OUTPUTDESTS.STDERR ];





/** Direct output that will not check for loglevel. */
function OUT_STDOUT (data)
{
    process.stdout.write (data);
}


/** Direct output that will not check for loglevel. */
function OUT_STDERR (data)
{    
    process.stdout.write (data);
}


/** Direct output that will not check for loglevel. */
function OUT_TXT_STDOUT (str, lf = true)
{
    if (lf)
        console.log (str);
    else
        OUT_STDOUT (str)
}

/** Direct output that will not check for loglevel. */
function OUT_TXT_STDERR (str, lf = true)
{
    if (lf)
        console.error (str);
    else
        OUT_STDERR (str)
}



// Data output. Non-silenceable.
function OUT_BIN (data)
{
    for (const d of Main.GetOutputDests () )
    {
        d?.OutputBinary (data);        
    }
}



// Data output. Non-silenceable.
function OUT_TXT (line)
{
    for (const d of Main.GetOutputDests () )
    {
        d?.OutputLine (line);        
    }
}


// Data output. Non-silenceable.
function OUT_TXT_RAW (str)
{
    for (const d of Main.GetOutputDests () )
    {
        d?.OutputBinary (str);        
    }    
}

// Data output. Non-silenceable.
function OUT_ANSI (ansicode)
{
    for (const d of Main.GetOutputDests () )
    {
        d?.OutputANSICode (ansicode);        
    }
}

function RESET_ANSI ()
{
    for (const d of Main.GetOutputDests () )
    {
        d?.OutputANSICode (ANSICODE_CLEAR);
    }
}

function OUT_NEWLINE ()
{
    for (const d of Main.GetOutputDests () )
    {
        d?.OutputBinary (CHR_NEWLINE);        
    }        
}

function OUT_NEWLINE_STDOUT ()
{
    OUT_STDOUT (CHR_NEWLINE);    
}

function OUT_NEWLINE_STDERR ()
{
    OUT_STDERR (CHR_NEWLINE);    
}

function OUT_TXT_OBJ (obj, {src = null, output_func = INFO, indent = 0, spacer = 2, 
                            depth = CONSTANTS.OBJPRINT_DEPTH_DEFAULT, fields = null, nullvalue = undefined} = {} )
{
    let params = {src, output_func, indent, spacer, depth, fields, nullvalue};


    if (obj == null)
        return ERR_PROGRAM ("No 'obj' given.", "OUT_TXT_OBJ");

    else
    {
        // Get a Javascript object containing the field-value pairs if dealing with SARTObject, otherwise assume obj is JSobj or an array.
        const entries = Object.entries (obj.GetFieldValuesJSObj != null ? obj.GetFieldValuesJSObj () : obj);        
        
        let key_max_len = 0;        

        // Find the maximum length from among the keys
        if (fields?.length > 0) 
        {
            for (const k of fields)
            {
                if (k.length > key_max_len)
                    key_max_len = k.length;
            }
        }
        else for (const e of entries)
        {
            if (e[0]?.length > key_max_len)
                key_max_len = e[0].length;
        }       
        
        const value_start_offset = params.indent + key_max_len + params.spacer;
                

        for (const e of entries)
        {            
            const key = e[0];
            const val = e[1];
            
            // TODO Optimize - move branch out of the loop
            if (fields == null || fields.includes (key) )
            {
                OUT_TXT_ENTRY (key, val, {...params, key_max_len} );
                                
                if (val != null && params.depth > 0 && Util.IsContainer (val) )
                {                                                                          
                    OUT_TXT_OBJ (val?.AsArray != null ? val.AsArray () : val, 
                                 {...params, ...{depth: params.depth - 1, indent: value_start_offset} } );
                }    
            }
        }
    }
}

/** Will try to determine what entry is. */
function OUT_TXT_ENTRY (key, value, 
    {src = null, output_func = INFO, indent = 0, spacer = 2, key_max_len = 10, depth = CONSTANTS.OBJPRINT_DEPTH_DEFAULT, nullvalue = undefined} = {} )
{
    const params = {src, output_func, indent, spacer, key_max_len, depth, nullvalue};
    output_func (" ".repeat (indent) + key?.padEnd (key_max_len + spacer) + (value == null ? nullvalue : value.toString () ), params);
}


/** Fields for 'recursive': 'depth', integer */
/*
function OUT_OBJ (obj, opts = { indent: 0, txt_obj: null, recursive_fields: [], recursive: {}, header: true, format: null, recursive_depth: 0 } ) 
{

    if (obj == null)
        return false;


    // Default values
    if (opts.indent == null)             opts.indent           = 0;
    if (opts.recursive_depth == null)    opts.recursive_depth  = 0;
    if (opts.recursive_fields == null)   opts.recursive_fields = [];
    if (opts.recursive == null)          opts.recursive        = {};
    if (opts.header == null)             opts.header = true;
    

    const out_fmt = opts.format != null ? opts.format : GetSetting (SETTINGS.OutputFormat);


    switch (out_fmt) 
    {        
        case Constants.OUTPUTFORMATS.JSON:
       
            try
            { 
                OUT_TXT (JSON.stringify (obj, null, GetSetting (SETTINGS.JSONSpacing)) ); 
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
                    const var_str = !GetSetting (SETTINGS.VarNamesUppercase) ? e[0] : e[0]?.toUpperCase ();

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

                val = val.replace (/,/g, GetSetting (SETTINGS.CSVReplacePeriodWith) );

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
                const var_str = !GetSetting (SETTINGS.VarNamesUppercase) ? e[0] : e[0]?.toUpperCase ();

                const field = e[0];
                const val   = e[1];
                
                // Special control field
                if (field.startsWith ("__") )
                {
                    if (field == FIELD_ANSI)
                        if (IsANSIAllowed () == true) 
                            OUT_TXT_RAW (val);                    
                }

                // Value is an object that's set to recursive display
                else if (opts.recursive_depth > 0 
                          || (val != null && val[FIELD_RECURSIVE] == true) 
                          || (val != null && opts != null && (opts.recursive[field] != null || opts.recursive_fields?.includes (field) ) )
                          )
                {
                    OUT_TXT (" ".repeat (opts.indent) + var_str?.padEnd (longest_len, " ") 
                            + " ".repeat (FIELD_VALUE_SPACER) + "-----");
                            
                    const set_recursion = opts.recursive[field]?.depth;
                                                            
                    OUT_OBJ (e[1], 
                    { 
                        indent:           opts.indent + longest_len + FIELD_VALUE_SPACER, 
                        recursive_depth:  set_recursion != null ? set_recursion : opts.recursive_depth - 1,
                        format:           out_fmt,

                        recursive:        opts.recursive,
                        recursive_fields: opts.recursive_fields,
                        header:           opts.header                        
                    });
                }

                // Display the field-value pair.
                else
                {
                    let val_str = val != null ? val.toString () : "-";
                    
                    if (val_str == "[object Object]") // Too ugly to be listed like this.
                        val_str = "<OBJECT>";

                    let pos
                    if (IsANSIAllowed () && (pos = val_str.search (WARNING_CHR_SEQ_REGEXP)) != -1)
                        val_str = ANSIERROR (val_str).replace (/!!!/g, ANSI_BLINK + "!!!" + ANSI_BLINK_OFF);

                    OUT_TXT (" ".repeat (opts.indent) + var_str?.padEnd (longest_len, " ") 
                            + " ".repeat (FIELD_VALUE_SPACER) + val_str);
                }
            }
            );
            break;
    }

}
*/


// Informative output, ie. for 'help'.
function INFO (str, params = {src = null, depth = CONSTANTS.OBJPRINT_DEPTH_DEFAULT} = {})
{       
    if (Util.IsString (params))
        params = {src: params, depth : CONSTANTS.OBJPRINT_DEPTH_DEFAULT};

    params.output_func = INFO;

    if (IsMsg () )
    {
        if (Util.IsString (str) )
        {
            const msg = params.src != null ? params.src + ": " + str : str;
            if (IsMsgSTDOUT () ) OUTPUTDESTS.STDOUT.OutputLine (msg);
            if (IsMsgSTDERR () ) OUTPUTDESTS.STDERR.OutputLine (msg);
        }
        else
            OUT_TXT_OBJ (str, params);
    }
}



// Detailed informative output - needs to be enabled.
function VERBOSE (str, params = {src = null, depth = CONSTANTS.OBJPRINT_DEPTH_DEFAULT} = {})
{            
    if (Util.IsString (params))
        params = {src: params, depth : CONSTANTS.OBJPRINT_DEPTH_DEFAULT};

    params.output_func = VERBOSE;

    if (IsVerbose () )
    {
        if (Util.IsString (str) )
        {
            const msg = params.src != null ? params.src + ": " + str : str;
            if (IsMsgSTDOUT () ) OUTPUTDESTS.STDOUT.OutputLine (msg);
            if (IsMsgSTDERR () ) OUTPUTDESTS.STDERR.OutputLine (msg);
        }
        else
            OUT_TXT_OBJ (str, params);
    }
}



// Very extensive output - needs to be enabled.
function DEBUG (str, params = {src = null, depth = CONSTANTS.OBJPRINT_DEPTH_DEFAULT} = {})
{       
    if (Util.IsString (params))
        params = {src: params, depth : CONSTANTS.OBJPRINT_DEPTH_DEFAULT};

    params.output_func = DEBUG;

    if (IsDebug () )
    {
        if (Util.IsString (str) )
        {
            const msg = params.src != null ? params.src + ": " + str : str;
            if (IsMsgSTDOUT () ) OUTPUTDESTS.STDOUT.OutputLine (msg);
            if (IsMsgSTDERR () ) OUTPUTDESTS.STDERR.OutputLine (msg);
        }
        else
            OUT_TXT_OBJ (str, params);
    }
}



// Warning. Return true if the warning is suppressed.
function WARN (str, params = {src = null, depth = CONSTANTS.OBJPRINT_DEPTH_DEFAULT} = {} )
{
    if (Util.IsString (params))
        params = {src: params, depth: CONSTANTS.OBJPRINT_DEPTH_DEFAULT};

    params.output_func = WARN;

    if (!IsQuiet () )
    {
        if (Util.IsString (str) )
        {
            const msg = params.src != null ? params.src + ": " + str : str;
            if (IsErrSTDOUT () ) OUTPUTDESTS.STDOUT.OutputLine (ANSIWARNING (msg) );
            if (IsErrSTDERR () ) OUTPUTDESTS.STDERR.OutputLine (ANSIWARNING (msg) );        
        }
        else
            OUT_TXT_OBJ (str, params);
    }    
    return false;    
}



// Error message output. Abort on false - return true if error is suppressed.
function ERR (str, params = {src = null, depth = CONSTANTS.OBJPRINT_DEPTH_DEFAULT} = {} )
{    
    if (Util.IsString (params))
        params = {src: params, depth: CONSTANTS.OBJPRINT_DEPTH_DEFAULT};

    params.output_func = ERR;

    if (!IsQuiet () )
    {        
        if (Util.IsString (str) )
        {
            const msg = "ERROR: " + (params.src != null ? params.src + ": " + str : str);
            if (IsErrSTDOUT () ) OUTPUTDESTS.STDOUT.OutputLine (ANSIERROR (msg) );
            if (IsErrSTDERR () ) OUTPUTDESTS.STDERR.OutputLine (ANSIERROR (msg) );        
        }
        else
            OUT_TXT_OBJ (str, params);
    }       
    return false;
}



// An error that can be overridden with --force
function ERR_OVERRIDABLE (str, src)
{
    if (!IsForceful () )
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


function ERR_PROGRAM (msg, {src = null, once = false, fatal = false} )
{
    const opts = {src, once, fatal};

    if (opts.once)
        ERR_ONCE ("PROGRAM ERROR: " + msg, opts);
    else
        ERR ("PROGRAM ERROR: " + msg, opts);

    if (fatal)
    {
        if (!State.IsConsoleActive () )    
        EXIT (-1);
    }
}

function ERR_PROGRAM_ONCE (msg, opts = {src = null} = {} )
{ 
    opts.once = true;
    return ERR_PROGRAM (msg, opts); 
}


// Display the same error only once.
// I'd like to use a hash for the lookup here, but there doesn't
// seem to be a fast built-in method for doing that.
const DISPLAYED_ERRORS = {};
function ERR_ONCE (str, args = {src = null, error_id = null} = {} )
{    
    if (Util.IsString (args))
        args = {src: args, depth: CONSTANTS.OBJPRINT_DEPTH_DEFAULT};

    if (!IsQuiet () && DISPLAYED_ERRORS[str] == null )
    {
        DISPLAYED_ERRORS [str] = true;
        return ERR (str, args);
    }

    return false;
}

function WARN_ONCE (str, args = {src = null, error_id = null} = {} )
{    
    if (!IsQuiet () && DISPLAYED_ERRORS[str] == null )
    {
        DISPLAYED_ERRORS [str] = true;
        return WARN (str, src, args);
    }

    return false;
}


// Error message output + exit or return false.
function ERR_ABORT (str, args = {src = null, error_id = null} = {} )
{
    ERR (str, args);

    if (!State.IsConsoleActive () )    
        EXIT (-1);

    return false;
}



// Error message output + exit.
function ERR_FATAL (str, args = {src = null} = {})
{
    ERR (str, args);
    EXIT (-1);
}



function EXIT (code)
{    
    process.exit (!isNaN (code) ? code : 0);
}


async function INPUT_LINE (settings = { prompt_str: "SART> ", caption_str: null } )
{
    if (IsTTY () )
    {
        if (settings.caption_str != null)
            OUT_TXT (settings.caption_str);

        if (settings.prompt_str != null)
            OUT_TXT_RAW (settings.prompt_str);

        const input = ReadLine.createInterface ( {input: process.stdin, output: null} );
    
        let input_line;
        for await (const line of input)
        {
            input_line = line;
            break;     
        }        

        input.close ();
        return input_line;
    }
    else
    {
        ERR_PROGRAM_ONCE ("INPUT_LINE called when the STDIN is not a TTY!");
        return null;
    }
}

async function INPUT_GET_CONFIRM (severe = true, operation_name_str = null)
{
    const line = await INPUT_LINE 
    ({ 
        prompt_str: "CONFIRM ACTION " + (operation_name_str != null ? + "'" + operation_name_str + "' " : "") + "BY TYPING 'execute' "  
                     + (severe ? "IN UPPERCASE TO PROCEED> " : "TO PROCEED> "),        
    })

    return Util.StrCmp (line, "EXECUTE", !severe);
}

async function INPUT_GET_YESNO (question_str = null, default_choice = false)
{
    const line = await INPUT_LINE 
    ({ 
        prompt_str: (question_str != null ?  question_str + " " : "Proceed? ") + (default_choice == true ? CHOICESTR_DEFAULT_YES : CHOICESTR_DEFAULT_NO)                       
    })

    if (default_choice == true)
        return Util.StrCmp (line, "N", true) == false;
    else
        return Util.StrCmp (line, "Y", true) == true;
    
}


function ON_EXCEPTION (exception, src = "Something", subject = null)
{    
    if (exception != null)
    {        
        if (IsDebug () )
        {            
            DEBUG (src + " caused the following exception:")
            DEBUG (exception);
        }
        
        if (IsVerbose () )
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
    OUT_STDOUT,
    OUT_STDERR,
    OUT_TXT_STDOUT,
    OUT_TXT_STDERR,    
    OUT_TXT,
    OUT_TXT_RAW,
    OUT_TXT_OBJ,
    OUT_BIN,
    OUT_ANSI,
    RESET_ANSI,
    OUT_NEWLINE,
    SET_RECURSIVE_OUT,
    ANSI,
    ANSIRED,
    ANSIYELLOW,
    ANSIERROR,
    ANSIWARNING,
    ANSIPENDING,
    ANSICODE,
    ANSISETCOLOR,
    ANSICLEAR,
    INFO,
    VERBOSE,
    DEBUG,
    WARN,
    WARN_ONCE,
    ERR,
    ERR_ABORT,
    ERR_OVERRIDABLE,
    ERR_CONFLICT,
    ERR_PROGRAM,
    ERR_PROGRAM_ONCE,
    ERR_MISSING_ARG,
    ERR_ONCE,
    ERR_FATAL,
    EXIT,
    ON_EXCEPTION,
    ErrorHandler,
    OutputDest_File,
    OUTPUTDESTS,
    OUTPUTDEST_STDOUT: OUTPUTDESTS.STDOUT,
    OUTPUTDEST_STDERR: OUTPUTDESTS.STDERR,
    OUTPUTDESTS_STDOUT,
    OUTPUTDESTS_STDERR,
    SetMain,
    GetMain,
    IsDebug,
    IsMsg,
    IsVerbose,
    Async,
    ReadFile,
    INPUT_LINE,
    INPUT_GET_CONFIRM,
    INPUT_GET_YESNO,
    IsProgressIndicatorEnabled
};