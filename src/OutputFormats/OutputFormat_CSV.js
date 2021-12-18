// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputFormat_CSV.js - 2021-12-12_01
//
// Output writer for CSV.
//

const Sys          = require ("../System");
const OutputFormat = Sys.OutputFormat;
const OutputParams = Sys.OutputParams;


class OutputFormat_CSV extends OutputFormat
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
}

module.exports = OutputFormat_CSV;