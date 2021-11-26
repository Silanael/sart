//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Sys.OUT_OBJ.js - 2021-10-30_01
// Temporary file.
//


const Settings = require('./settings.js');
const Util     = require ('./util.js');

const FIELD_RECURSIVE    = "__SART-RECURSIVE"
const FIELD_ANSI         = "__ANSI";
const FIELD_VALUE_SPACER = 2;


function SetRecursive (obj)
{
    obj[FIELD_RECURSIVE] = true;
}


function Print (obj, opts = { indent: 0, txt_obj: null}, fn_txt, fn_txt_raw, fn_err ) 
{

    if (obj == null)
        return false;


    switch (State.Config.OutputFormat) 
    {        
        case Settings.OutputFormats.JSON:
            
            if (obj != null)
            {
                try               {  fn_txt (JSON.stringify (obj) ); }
                catch (exception) { Sys.ON_EXCEPTION (exception, "Util.ObjToJSON (" + obj?.name + ")"); }
            }
            else
            {
                fn_err ("Unable to convert object " + obj + " to JSON - trying to print it as-is:");
                fn_txt (obj);
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
                const var_str = !State.Config.VarNamesUppercase ? e[0] : e[0]?.toUpperCase ();

                const field = e[0];
                const val   = e[1];
                
                // Special control field
                if (field.startsWith ("__") )
                {
                    if (field == FIELD_ANSI)
                        if (State.Config.ANSIAllowed == true) 
                            fn_txt_raw (val);                    
                }

                // Value is an object that's set to recursive display
                else if (val != null && val[FIELD_RECURSIVE] == true)
                {
                    fn_txt ( (var_str).padStart(opts.indent) + " ".repeat (FIELD_VALUE_SPACER) + "-----" );
                    Print (e[1], { indent: opts.indent + longest_len + FIELD_VALUE_SPACER }, fn_txt, fn_txt_raw, fn_err )
                }

                // Display the field-value pair.
                else
                {
                    const val_str = val != null ? val.toString () : "-";
                    
                    fn_txt (" ".repeat (opts.indent) + var_str?.padEnd (longest_len, " ") 
                            + " ".repeat (FIELD_VALUE_SPACER) + val_str);
                }
            }
            );
            break;
    }


}

module.exports = { Print, SetRecursive };