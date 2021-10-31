//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// PrintObj_Out.js - 2021-10-30_01
// Temporary file.
//


const Sys      = require('./sys.js');
const Settings = require('./settings.js');
const Util     = require ('./util.js');



function PrintObj_Out (obj, opts = { indent: 0, txt_obj: null } ) 
{

    if (obj == null)
        return false;


    switch (Settings.Config.OutputFormat) 
    {        
        case Settings.OutputFormats.JSON:

            const json = Util.ObjToJSON (obj);

            if (json != null)
                Sys.OUT_TXT (json);

            else
            {
                Sys.ERR ("Unable to convert object " + obj + " to JSON - trying to print it as-is:");
                Sys.OUT_TXT (obj);
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
                const val_str = e[1] != null ? e[1].toString () : "-";
                const var_str = !Settings.Config.VarNamesUppercase ? e[0] : e[0]?.toUpperCase ();

                Sys.OUT_TXT (var_str?.padEnd(longest_len, " ").padStart(opts.indent * 4, " ") + "  " + val_str);                
            }
            );
            break;
    }


}

exports.PrintObj_Out = PrintObj_Out;
