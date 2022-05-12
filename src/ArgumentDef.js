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
    IsOptional           = false;
    AllowMultiple        = false;
           
    Key                  = null;
    Value                = null;
    ValidValues          = null;
    ValidValueFunc       = null;
    ValueInvalidMsg      = null;
           
    Invokes              = [];
       
    Deprecated           = false;
    UnderWork            = false;

    DeprMsgStr           = null;


    WithKey              (key, value = null)                   { this.Key = key;      this.Value = value;                           return this; }    
    WithInvoke           (...option_names)                     { this.Invokes         = option_names;                               return this; }
    WithDeprecated       (depr_msg_str)                        { this.Deprecated      = true; this.DeprMsgStr = depr_msg_str;       return this; }
    WithUnderWork        ()                                    { this.UnderWork       = true;                                       return this; }
    WithHasParam         ()                                    { this.HasParameter    = true;                                       return this; }
    WithIsOptional       ()                                    { this.IsOptional      = true;                                       return this; }
    WithAllowMultiple    ()                                    { this.AllowMultiple   = true;                                       return this; }
    WithParamValidList   (...valid_values)                     { this.HasParameter    = true; this.ValidValues    = valid_values;   return this; }
    WithParamValidFunc   (val_valid_func, msg_invalid = null)  { this.HasParameter    = true; this.ValidValueFunc = val_valid_func; 
                                                                 this.ValueInvalidMsg = msg_invalid;                                return this; }
      
    CanBeInvoked         ()                                    { return !this.Deprecated && !this.UnderWork;  }
    GetKey               ()                                    { return Util.Or (this.Key, this.GetName () ); }    
    IsValueValid         (value)                               { return  ! (   (this.ValidValues    != null && ! this.ValidValues.includes (value) ) 
                                                                            || (this.ValidValueFunc != null && ! this.ValidValueFunc       (value) ) ); }
    IsArgInDataObj       (data_obj)                            { return data_obj?.hasOwnProperty (this.GetKey () ); }        
    GetValueFromDataObj  (data_obj)                            { return data_obj?.[this.GetKey () ]; }        
    

    /** Returns null if the value is not valid. */
    GetValue (value_override)    
    { 
        const val = value_override != null ? value_override : this.Value;
        return this.HasParameter ? this.IsValueValid (val) ? val : null 
                                 : null;
    }

    GetNoInvokeReasonStr ()
    {
        return this.Deprecated ? "The argument is deprecated." + (this.DeprMsgStr != null ? " " + this.DeprMsgStr: "")
                               : this.UnderWork ? "The feature is not yet ready."
                                                : "???";
    }
 
    
    InvokeArg (argdefs, param = null, func = null, data_obj = null)
    {

        if (func != null && data_obj != null)
            return Sys.ERR_PROGRAM ("InvokeArg: Both 'func' and 'data_obj' are defined!", {src: this} );

        if (this.CanBeInvoked () )
        {
            Sys.VERBOSE ("Invoking argument '" + this.GetName () + "' with " + (param != null ? "parameter '" + param + "'." : "no parameter.") );
            
            if (this.HasParameter)
            {
                if (param == null)
                    return Sys.ERR ("Argument '" + this + "' missing a parameter!");

                else if (!this.IsValueValid (param) )
                {
                    const reason_msg = this.ValueInvalidMsg != null ? ": " + this.ValueInvalidMsg
                                                                    : this.ValidValues != null ? ": Allowed values: " + Util.ArrayToStr (this.ValidValues)
                                                                                               : "";
                    return Sys.ERR ("Argument '" + this.GetName () + "': Invalid value '" + param + "'" + reason_msg)
                }
            }

            const val = this.GetValue (param);
            
            if (func != null)
                func (this, val);

            else if (data_obj != null)
                data_obj[this.GetKey ()] = val;
            
            
            // Invoke listed arguments, if any.
            if (this.Invokes.length > 0)
            {
                if (argdefs == null)
                    return Sys.ERR_PROGRAM ("Unable to invoke the additional arguments - 'argdefs' null!", {src: this});

                else for (const i of this.Invokes)
                {
                    if (argdefs.GetByName (i, false)?.InvokeArg (argdefs, null, func) != true)                    
                        return Sys.ERR ("Failed to invoke argument '" + i + "' linked to argument '" + this + "'!");
                    else
                        Sys.DEBUG ("Invoked argument '" + i + "' from the invoke-list of argument '" + this + "'.");
                }
            }

            return true;
        }
        else                    
            return Sys.ERR ("Could not invoke argument " + this + ": " + this.GetNoInvokeReasonStr () );        
    }

    
}



module.exports = ArgumentDef;