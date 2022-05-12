// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputFormat_TXT.js - 2021-12-07_01
//
// Output writer for plaintext.
//

const CONSTANTS    = require ("../CONSTANTS");
const FieldData    = require ("../FieldData").FieldData;
const SARTObject   = require ("../SARTObject");
const SARTGroup    = require ("../SARTGroup");
const OutputFormat = require ("../OutputFormat");
const OutputParams = require ("../OutputParams");
const Sys          = require ("../System");



class OutputFormat_TXT extends OutputFormat
{

    __DoOutputObjects (objects, params = new OutputParams (), field_defs)
    {             

        const color = params.GetColor ();
     
        if (color != null)
            this.__Out_ANSICode (color);

        if (params.GetListMode () == CONSTANTS.LISTMODE_TABLE)
        {
            let   str_line      = "| ";            
            let   str_caption   = "| ";
            let   str_separator = "+-";

            let   fval_str;
            let   fname;
            let   flen;            
            let   field_data;
            let   total_width_chrs = 0;
            const field_lens = {};
            

            // Caption            
            for (const f of field_defs.AsArray () )
            {
                fname             = f.GetName ();
                flen              = objects.GetFieldMaxLen (fname) + 3;
                field_lens[fname] = flen;

                str_caption   += (fname != null ? fname.padEnd (flen - 3) : " ".repeat (flen - 3) ) + " | " ;
                str_separator += "-".repeat (flen - 3) + "-+-";

                total_width_chrs += flen;
            }
            this.__Out_Line (str_separator);
            this.__Out_Line (str_caption);            
            this.__Out_Line (str_separator);
            
            // Object lines            
            for (const obj of objects.AsArray () )
            {            
                field_data = obj.GetDataForFields (field_defs);
                str_line   = "| ";

                for (const f of field_data.AsArray () )
                {                            
                    fval_str  = f.GetFieldValue ()?.toString ();   
                    flen      = field_lens [f.GetFieldName () ];                
                    str_line += (fval_str != null ? fval_str.padEnd (flen - 3) : " ".repeat (flen - 3) ) + " | " ;
                }
                this.__Out_Line (str_line);            
            } 

            this.__Out_Line (str_separator);
                       
        }

        // Separate entries
        else
            this.__OutputObjects (objects, 0, field_defs, params);
  

        if (color != null)
            Sys.RESET_ANSI ();

    }

    __OutputObj (obj, indent = 0, field_defs = null, params, longest_field_name = null)
    {

        // Get field defs from the first object
        if (field_defs == null)
            field_defs = OutputFormat.GET_FIELD_DEFS (obj, params);

        // No fields given for the sub-obj
        if (field_defs == null)
            return;
            
        if (longest_field_name == null)
            longest_field_name = field_defs.GetNameMaxLen ();


        const field_data         = obj.GetDataForFields (field_defs);  
        const value_start_offset = indent + longest_field_name + 2;


        for (const f of field_data.AsArray () )
        {        
            if (f != null)
            {                 
                if (f instanceof SARTObject)
                    this.__OutputObj     (f, value_start_offset, null, params, null);

                else if (f instanceof SARTGroup)
                    this.__OutputObjects (f, value_start_offset, null, params);

                else
                {
                    this.__Out_Line 
                    (
                        " ".repeat (indent) 
                        + f.GetFieldName()?.padEnd (longest_field_name, " ") 
                        + " ".repeat (2) 
                        + f.GetFieldTextValue ()
                    );
                }                
            }
        }                            
    }

    __OutputObjects (objects, indent = 0, field_defs = null, params)
    {        
        // Get field defs from the first object
        if (field_defs == null)
            field_defs = OutputFormat.GET_FIELD_DEFS (objects, params);

        // No data for sub-obj
        if (field_defs == null)
            return;

        // Find longest length of field name
        const longest_field_name = field_defs.GetNameMaxLen ();        
                
        const len = objects.GetAmount ();
        let pos = 0;
        for (const obj of objects.AsArray () )
        {
            this.__OutputObj (obj, indent, field_defs, params, longest_field_name);
            ++pos;
            if (pos < len)
                this.__Out_Line ("***");
        }                
    }
 
}

module.exports = OutputFormat_TXT;