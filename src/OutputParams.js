// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Option.js - 2022-02-04_01
//
// Parameters passed to SARTObject.Output
//

const Util      = require ("./Util");
const CONSTANTS = require ("./CONSTANTS");


class OutputParams
{
    CMD_Instance = null;
    Color        = null;
    Fields       = null;
    ListMode     = null;

    WithCMDInst    (cmd_instance)   { this.CMD_Instance = cmd_instance;                return this; }
    WithColor      (col_num)        { this.Color        = col_num;                     return this; }
    WithFields     (fields)         { this.Fields       = fields;                      return this; }
    WithAsTable    ()               { this.ListMode     = CONSTANTS.LISTMODE_TABLE;    return this; }
    WithAsSeparate ()               { this.ListMode     = CONSTANTS.LISTMODE_SEPARATE; return this; }
    WithListMode   (mode)           { this.ListMode     = mode;                        return this; }

    GetCmdInst    () { return this.CMD_Instance; } 
    GetColor      () { return this.Color;   } 
    GetFieldNames () { return Util.Or (this.Fields,   this.CMD_Instance?.GetRequestedFieldNames () ); }                                                                                              
    GetListMode   () { return Util.Or (this.ListMode, this.CMD_Instance?.GetRequestedListMode   () ); }
    
}

module.exports = OutputParams;