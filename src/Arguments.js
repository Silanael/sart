const Sys  = require ("./System");
const Util = require ("./Util");





class Arguments 
{

    _Argv        = null;
    _Unprocessed = null;    


    constructor (argv) 
    {
        this._Argv        = argv;
        this._Unprocessed = [...argv];        
    }


    HasNext            () { return this._Argv != null && this._Unprocessed?.length > 0 ? true : false; }
    Peek               () { return this.HasNext () ? this._Unprocessed[0] : null;                      }
    GetNext            () { return this._Unprocessed.shift ();                                         }
    GetNextLC          () { return this.GetNext ()?.toLowerCase();                                     }
    GetNextUC          () { return this.GetNext ()?.toUpperCase();                                     }    
    GetTotalAmount     () { return this._Argv != null ? this._Argv.length : 0;                         }
    GetRemainingAmount () { return this.HasNext () ? this._Unprocessed.length : 0;                     }
    AllToStr           () { return Util.ArrayToStr (this._Argv);                                       }
    RemainingToStr     () { return this.HasNext () ? Util.ArrayToStr (this._Unprocessed) : null;       }

    
    RequireAmount (amount, msg = null) 
    {
        if (this._Argv.length - this._Pos < amount) 
        {
            Sys.ERR_MISSING_ARG (msg);
            return false;
        }

        else
            return true;
    }


    static GetArgDef (argdefs, argname) { return argdefs.GetByName (argname, true); }
    

    /** Adds the valid options to the config provided, returning an Arguments-instance containing non-arguments (command and command-parameters). */
    ProcessArgs (argdefs, handler_func = function (argdef, argname, param) { return false; } ) 
    {
        if (this._Argv == null || argdefs == null || handler_func == null) 
        {
            Sys.ERR_PROGRAM ( (this._Argv == null ? "'argv' " : "") +
                              (argdefs == null    ? "'argdefs' " : "") +
                              (target  == null    ? "'target' " : "") +
                              " null!", "Args");
            return false;
        }

        Sys.DEBUG ("Starting to process " + this.GetRemainingAmount () + " arguments with a def-group '" + argdefs + "'..");
        
        const unprocessed = [];
        let i = 1;      

        while (this._Unprocessed.length > 0)
        {            
            const arg_name = this._Unprocessed.shift ();

            Sys.DEBUG("Argument #" + i + ": " + arg_name);

            const def = Arguments.GetArgDef (argdefs, arg_name);

            if (def != null)
            {
                if (! this.__ProcessArg (argdefs, def, def.HasParameter ? this._Unprocessed.shift () : null, handler_func) )
                    return Sys.ERR ("Error with argument #" + i + " '" + arg_name + "'");                
            }

            else if (arg_name.startsWith ("--") ) 
                return Sys.ERR ("Unrecognized option '" + i + "'. Aborting argument-processing process.", "ProcessArgs");
                                    
            else
                unprocessed.push (arg_name);

            ++i;
        }

        this._Unprocessed = unprocessed;

        return true;
    }


    __ProcessArg (argdefs, argdef, param, handler_func = function (argdef, argname, param) { return false; } )
    {
        if (argdef.CanBeInvoked () )
        {
            Sys.VERBOSE ("Invoking argument '" + argdef.GetName () + "' with " + (param != null ? "parameter '" + param + "'." : "no parameter.") );

            if (! handler_func (argdef, argdef.GetName (), param) )
                return false;
            
            // Invoke listed arguments, if any.
            if (argdef.Invokes.length > 0)
            {
                if (argdefs == null)
                    return Sys.ERR_PROGRAM ("Unable to invoke the additional arguments - 'argdefs' null!", this);

                else for (const i of this.Invokes)
                {
                    if (! this.__ProcessArg (argdefs, Arguments.GetArgDef (argdefs, i), null, handler_func) )
                        return Sys.ERR ("Failed to invoke argument '" + i + "' linked to argument '" + argdef + "'!");
                    else
                        Sys.DEBUG ("Invoked argument '" + i + "' from the invoke-list of argument '" + argdef + "'.");
                }
            }

            return true;
        }
        else                    
            return Sys.ERR ("Could not invoke argument " + argdef + ": " + argdef.GetNoInvokeReasonStr () );        
    }
}


module.exports = Arguments;