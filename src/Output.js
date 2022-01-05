// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2021-12-20_01
//
// Base classes for data output.
//

const Sys       = require ("./System");
const SARTBase  = require ("./SARTBase");
const SARTGroup = require ("./SARTGroup");
const SETTINGS  = require ("./SETTINGS").SETTINGS;


class OutputParams
{
    WantedFields = null;
    UseListMode  = null;
}


class OutputFormat extends SARTBase 
{
    FileExtension = null;


    OutputObjects (objects = new SARTGroup, params = new OutputParams () )
    {
        if (objects == null || objects.length <= 0)
            return ERR_PROGRAM ("OutputFormat.OutputObjects: No objects given.");

        if (params == null)
            params = new OutputParams ();

        const setting_list_mode = Sys.GetMain ().GetSetting (SETTINGS.OutputAsList);

        if (setting_list_mode != null)
            params.UseListMode = setting_list_mode;
            
        this.__DoOutputObjects (objects, params);
    }


    /** Overridable. This implementation does nothing. */
    __DoOutputFieldCaptions (field_names     = [], params, objec                                            ) {}
    __DoOutputObject        (obj, field_data = [], params = new OutputParams (), objects = new SARTGroup () ) {}
    __DoOutputObjects       (objects, params = new OutputParams ()                                          ) {}

    
    __Out_Line   (line)  { Sys.OUT_TXT     (line); }
    __Out_RawTXT (txt)   { Sys.OUT_TXT_RAW (txt);  }
    __Out_BIN    (data)  { Sys.OUT_BIN     (data); }
}


module.exports = { OutputFormat, OutputParams }