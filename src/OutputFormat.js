// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2021-12-20_01
//
// Base class for output formats.
//

const CONSTANTS    = require ("./CONSTANTS");
const Sys          = require ("./System");
const Util         = require ("./Util");
const SETTINGS     = require ("./SETTINGS").SETTINGS;
const OutputParams = require ("./OutputParams");



class OutputFormat
{
    FileExtension = null;


    OutputObjects (objects = new SARTGroup (), params = new OutputParams () )
    {
        if (objects == null || objects.GetAmount () <= 0)
            return ERR_PROGRAM ("OutputFormat.OutputObjects: No objects given.");

        if (params == null)
            params = new OutputParams ();

        const first_obj  = objects.GetByIndex != null ? objects.GetByIndex (0) : objects;
        const fieldnames = first_obj?.GetEffectiveFieldDefGroup ({outparams: params})?.GetNamesAsArray ();

        if (fieldnames != null)
            this.__DoOutputObjects (objects, params, fieldnames);        
        else
            Sys.INFO ("No data.");
    }

    
    /** Overridable. Logic of actually writing the output goes here. This implementation does nothing. */    
    __DoOutputObjects (objects, params = new OutputParams (), field_defs                                          ) {}

    
    /** Call these from __DoOutputObjects to output data into the active OutputDests. */
    __Out_Line      (line)  { Sys.OUT_TXT     (line); }
    __Out_RawTXT    (txt)   { Sys.OUT_TXT_RAW (txt);  }
    __Out_BIN       (data)  { Sys.OUT_BIN     (data); }
    __Out_ANSICode  (ansi)  { Sys.OUT_ANSI    (ansi); }
    __ResetANSI      ()     { Sys.RESET_ANSI  ();     }

}


module.exports = OutputFormat;