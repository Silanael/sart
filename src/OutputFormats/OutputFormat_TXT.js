// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputFormat_TXT.js - 2021-12-07_01
//
// Output writer for plaintext.
//

const Output       = require ("../Output");
const FieldData    = require ("../FieldData").FieldData;
const OutputFormat = Output.OutputFormat;
const OutputParams = Output.OutputParams;



class OutputFormat_TXT extends OutputFormat
{

    __DoOutputObjects (objects, params = new OutputParams ())
    {        
        if (params.UseListMode == true)
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
            
            
            const first_obj  = objects.GetByIndex (0);
            const field_defs = first_obj != null ? first_obj.GetFieldDefs (params.WantedFields, "list") : null;

            if (field_defs == null)
                return false;


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
        else
        {
            this.__Out_Line ("foo");
        }
    }


    __DoOutputObject (obj, field_data = new FieldData (), params = new OutputParams (), objects)
    {
        if (params.UseListMode == true)
        {
            let str_line = "";
            let field_len;            
            let fval_str;

            for (const f of field_data.AsArray () )
            {        
                fval_str  = f.GetFieldValue ()?.toString ();   
                field_len = objects.GetFieldMaxLen (f.GetFieldName () ) + 1;
                
                str_line += fval_str != null ? fval_str.padEnd (field_len) : " ".repeat (field_len);
            }
            this.__Out_Line (str_line);
        }
        else
        {
            this.__Out_Line ("foo");
        }
    }


    __DoOutputFieldCaptions (field_defs = [], params, objects) 
    {
        let str_caption = "";
        for (const f of field_defs)
        {
            str_caption += f.GetName () + " ";
        }
        this.__Out_Line (str_caption);
    }
}

module.exports = OutputFormat_TXT;