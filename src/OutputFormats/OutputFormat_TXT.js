// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputFormat_TXT.js - 2021-12-07_01
//
// Output writer for plaintext.
//

const Sys = require ("../System");
const OutputFormat = Sys.OutputFormat;
const OutputParams = Sys.OutputParams;


class OutputFormat_TXT extends OutputFormat
{
    __DoOutputObject (obj, field_data = [], params = new OutputParams () )
    {
        if (params.UseListMode == true)
        {
            let str_line = "";
            for (const i of field_data)
            {                
                str_line += i.GetFieldValue () + " ";
            }
            this.__Out_Line (str_line);
        }
        else
        {
            this.__Out_Line ("foo");
        }
    }

    __DoOutputFieldCaptions (field_defs = []) 
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