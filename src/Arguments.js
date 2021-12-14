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
const SARTGroup = require ("./SARTGroup");


class ArgDef extends SARTDef
{
    HasParameter  = false;
    SettingKey    = null;
    SettingValue  = null;
    Function      = null;
    Alias         = null;
    Invokes       = [];

    Deprecated    = false;
    UnderWork     = false;


    /** This implementation does nothing.*/
    _DoInvoke (param, handler) {}


    WithAlias      (name)             { this.Alias       = name;         return this; }
    WithFunc       (func)             { this.Function    = func;         return this; }
    WithInvoke     (...option_names)  { this.Invokes     = option_names; return this; }
    WithDeprecated ()                 { this.Deprecated  = true;         return this; }
    WithUnderWork  ()                 { this.UnderWork   = true;         return this; }

    CanBeInvoked   ()                 { return !this.Deprecated && !this.UnderWork; }
    MatchesName    (name)             { return super.HasName (name, true) || (this.Alias != null && Util.StrCmp (name, this.Alias, false) ); }

    Invoke (param, handler, defs)
    {
        if (this.HasParameter && param == null)
            return Sys.ERR ("Parameter missing.", this);

        else if (this.CanBeInvoked () )
        {
            Sys.VERBOSE ("Invoking argument '" + this.GetName () + "' with " + (param != null ? "parameter '" + param + "'." : "no parameter.") );

            if (this.Function != null)
                this.Function (param, handler);

            else
                this._DoInvoke (param, handler);

            // Invoke listed arguments, if any.
            if (this.Invokes.length > 0)
            {
                if (defs == null)
                    return Sys.ERR_PROGRAM ("Unable to invoke the additional arguments - 'defs' null!", this);

                else for (const i of this.Invokes)
                {
                    defs.InvokeArgIfExists (i, null, handler);
                }
            }

        }
        else
        {
            if (this.Deprecated)
                return Sys.ERR ("Option deprecated and removed.", this);

            else if (this.UnderWork)
                return Sys.WARN ("This option is not yet ready. Stay tuned.", this);

            else
                return Sys.ERR_PROGRAM ("Unable to invoke argument '" + opt_name + " - argument not operational for undefined reason.");
        }
    }

  
}



class ArgDefs extends SARTGroup
{
    /** Returns the argument if invoked, null otherwise. */
    InvokeArgIfExists (arg_name, arg_param, handler)
    {
        if (handler == null)
            return Sys.ERR_PROGRAM ("'handler' null!", "InvokeArgsIfExists");

        for (const o of this.AsArray () )
        {            
            if (o != null && o.MatchesName (arg_name) )
            {                               
                o.Invoke (arg_param, handler, this);
                return o;
            }
            else
                Sys.DEBUG ("ArgDef " + o?.GetName () + " not matching arg_name '" + arg_name + "'.")
        }

        return null;
    }
}




class Args
{

    _Argv = null;
    _Pos  = 0;


    constructor (argv)
    {
        this.SetTo (argv);        
    }


    HasNext   ()     { return this._Argv != null && this._Pos < this._Argv.length; }
    PopLC     ()     { return this.Pop ()?.toLowerCase ();                         }
    PopUC     ()     { return this.Pop ()?.toUpperCase ();                         }
    Peek      ()     { return this._Argv[this._Pos];                               }
    GetAmount ()     { return this._Argv.length - this._Pos;                       }    

    SetTo (argv) 
    { 
        this._Argv = argv; this._Pos = 0; 

        if (argv == null) 
            Sys.ERR_PROGRAM ("SetTo: 'argv' null!", "Args"); 
    }


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
    

    Pop ()
    {
        if (this.HasNext () )
        {
            const arg = this._Argv[this._Pos];
            ++this._Pos;
            return arg;
        }
        else
            return null;
    }


    RemainingToStr ()
    { 
        let str = this._Argv[this._Pos];         
        for (let C = this._Pos + 1 ; C < this._Argv.length; ++C)
        {
            str += " " + this._Argv[C];
        }        
    }

    /** Adds the valid options to the config provided, returning an Arguments-instance containing non-arguments (command and command-parameters). */
    ProcessArgs (argdefs, handler)
    {
        if (this._Argv == null || argdefs == null || handler == null)
        {
            Sys.ERR_PROGRAM (this._Argv    == null ? "'argv'"    : null +
                                   argdefs == null ? "'argdefs'" : null +
                                   handler == null ? "'handler'" : null +
                                   + " null!", "Args");
            return null;
        }

        Sys.DEBUG ("Starting to process " + this.GetAmount () + " arguments..");
             
        const len = this._Argv.length;
        const unprocessed = [];
     
        for (let i = this._Pos; i < len;)
        {            
            const arg_name = this._Argv[i];
            Sys.DEBUG ("Argument #1: " + arg_name);

            const def = argdefs.InvokeArgIfExists (arg_name, ++i < len ? this._Argv[i] : null, handler)
        
            if (def != null)
            {
                // Skip over the parameter.
                if (def.HasParameter)
                ++i;
            }
            
            else if (arg_name.startsWith ("--") )            
            {
                Sys.ERR ("Unrecognized option '" + i + "'. Aborting argument-processing process.", "ProcessArgs");
                return false;
            }
            else
                unprocessed.push (arg_name);
        }
                                        
        this.SetTo (unprocessed);
        return true;        
    }


        
}

module.exports = { Args, ArgDef, ArgDefs };