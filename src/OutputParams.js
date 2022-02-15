// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2022-02-04_01
//
// Parameters passed to SARTObject.Output
//

const Sys       = require ("./System");
const SETTINGS  = require ("./SETTINGS").SETTINGS;
const CONSTANTS = require ("./CONSTANTS");


class OutputParams
{
    Command      = null;
    Color        = null;
    WantedFields = null;
    ListMode     = null;

    WithCMD      (cmd)     { this.Command      = cmd;                         return this; }
    WithColor    (col_num) { this.Color        = col_num;                     return this; }
    WithFields   (fields)  { this.WantedFields = fields;                      return this; }
    WithTable    ()        { this.ListMode     = CONSTANTS.LISTMODE_TABLE;    return this; }
    WithSeparate ()        { this.ListMode     = CONSTANTS.LISTMODE_SEPARATE; return this; }
    WithListMode (mode)    { this.ListMode     = mode;                        return this; }

    GetCmd     () { return this.Command; } 
    GetColor   () { return this.Color;   } 
    GetFields  () { return this.WantedFields != null ? this.WantedFields 
                                                     : this.Command != null && this.Command.HasWantedFields () ? this.Command.GetWantedFields ()
                                                                                                               : null; }
    

    GetListMode ()
    {
        return this.ListMode != null ? this.ListMode
                                     : this.Command != null ? this.Command.IsOutputAsTable () ? CONSTANTS.LISTMODE_TABLE : CONSTANTS.LISTMODE_SEPARATE
                                     : Sys.GetMain ().GetSetting (SETTINGS.OutputAsTable) ? CONSTANTS.LISTMODE_TABLE
                                                                                          : CONSTANTS.LISTMODE_SEPARATE;        
    }

}

module.exports = OutputParams;