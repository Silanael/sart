// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Arguments.js - 2021-12-07_01
//
// Command-arguments.
//

const Sys       = require ("./System");
const Util      = require ("./Util");
const SARTDef   = require ("./SARTDefinition");



class ArgumentDef extends SARTDef
{
    HasParameter         = false;
           
    Key                  = null;
    Value                = null;
           
    Invokes              = [];
       
    Deprecated           = false;
    UnderWork            = false;

    DeprMsgStr           = null;


    WithKey              (key, value = null) { this.Key = key;   this.Value = value;                      return this; }
    WithInvoke           (...option_names)   { this.Invokes      = option_names;                          return this; }
    WithDeprecated       (depr_msg_str)      { this.Deprecated   = true; this.DeprMsgStr = depr_msg_str;  return this; }
    WithUnderWork        ()                  { this.UnderWork    = true;                                  return this; }
    WithHasParam         ()                  { this.HasParameter = true;                                  return this; }
      
    CanBeInvoked         ()                  { return !this.Deprecated && !this.UnderWork; }
    GetKey               ()                  { return Util.Or (this.Key, this.GetName () ); }
    GetValue             (value_override)    { return value_override != null ? value_override : Util.Or (this.Value, true); }

    GetNoInvokeReasonStr ()
    {
        return this.Deprecated ? "The argument is deprecated." + (this.DeprMsgStr != null ? " " + this.DeprMsgStr: "")
                               : this.UnderWork ? "The feature is not yet ready."
                                                : "???";
    }
    
}



module.exports = ArgumentDef;