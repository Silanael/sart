// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2021-12-20_01
//
// Base classes for data output.
//

const CONSTANTS  = require ("./CONSTANTS");
const Sys        = require ("./System");
const SETTINGS   = require ("./SETTINGS").SETTINGS;


class OutputParams
{
    WantedFields = null;
    UseListMode  = null;
}


class OutputFormat
{
    FileExtension = null;


    OutputObjects (objects = new SARTGroup (), params = new OutputParams () )
    {
        if (objects == null || objects.length <= 0)
            return ERR_PROGRAM ("OutputFormat.OutputObjects: No objects given.");

        if (params == null)
            params = new OutputParams ();

        const setting_list_mode = Sys.GetMain ().GetSetting (SETTINGS.OutputAsTable);

        if (setting_list_mode != null)
            params.UseListMode = setting_list_mode;
            
        const field_defs = OutputFormat.GET_FIELD_DEFS (objects, params);

        if (field_defs != null)
            this.__DoOutputObjects (objects, params, field_defs);        
        else
            Sys.INFO ("No data.");
    }


    static GET_FIELD_DEFS (objects, params)
    {
        const first_obj  = objects.GetByIndex != null ? objects.GetByIndex (0) : objects;
        return first_obj != null ? first_obj.GetFieldDefs (params.WantedFields, params.UseListMode ? CONSTANTS.LISTMODE_TABLE 
                                                                                                   : CONSTANTS.LISTMODE_SEPARATE) : null;
    }

    /** Overridable. Logic of actually writing the output goes here. This implementation does nothing. */    
    __DoOutputObjects (objects, params = new OutputParams (), field_defs                                          ) {}

    
    /** Call these from __DoOutputObjects to output data into the active OutputDests. */
    __Out_Line   (line)  { Sys.OUT_TXT     (line); }
    __Out_RawTXT (txt)   { Sys.OUT_TXT_RAW (txt);  }
    __Out_BIN    (data)  { Sys.OUT_BIN     (data); }

}


module.exports = { OutputFormat, OutputParams }