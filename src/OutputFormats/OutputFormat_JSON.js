// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// OutputFormat_JSON.js - 2021-12-12_01
//
// Output writer for JSON.
//

const Output       = require ("../Output");
const OutputFormat = Output.OutputFormat;
const OutputParams = Output.OutputParams;


class OutputFormat_JSON extends OutputFormat
{
    __DoOutputObject (obj, field_data = [], params = new OutputParams () )
    {
        
    }
}

module.exports = OutputFormat_JSON;