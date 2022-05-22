const OPTIONS           = require ("./OPTIONS").OPTIONS;
const Sys               = require ("./System");
const Util              = require ("./Util");
const Config            = require ("./Config").Config;


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
    PeekLC             () { return this._Unprocessed[0]?.toLowerCase ();                               }
    PeekUC             () { return this._Unprocessed[0]?.toUpperCase ();                               }
    GetNext            () { return this._Unprocessed.shift ();                                         }
    GetNextLC          () { return this.GetNext ()?.toLowerCase ();                                    }
    GetNextUC          () { return this.GetNext ()?.toUpperCase ();                                    }    
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


    static GetArgDef (argdefs, argname) { return argdefs.GetByName (argname, false); }
    
    
    ProcessArgs (cmd_instance) 
    {

        if (cmd_instance == null)
            return Sys.ERR_PROGRAM ("ProcessArgs: cmd_instance null", {src: this} );

        if (this._Argv == null) 
            return Sys.ERR_PROGRAM ("ProcessArgs: _Argv null!", {src: this});                             
            

        Sys.DEBUG ("Starting to process " + this.GetRemainingAmount () + " arguments..");
        
        
        // Process options if any
        /*
        if (! this.ProcessArgGroup (Sys.GetMain ().GetOptions (), 
              (def, param) => commandsetup.Config.SetSetting (def.Key, param != null ? param : def.Value) )  )
        {
        */
        if (! OPTIONS.ProcessArgs (this, cmd_instance.Config) )
        {
            Sys.ERR ("Processing options returned false. Aborting the command execution sequence.");
            return false;
        }

        // The next unprocessed agrument should be the command        
        const cmd_def       = this.__GetCommandDef (this.GetNextLC () );
        cmd_instance.CMDDef = cmd_def;

        if (cmd_def == null)
        {
            if (cmd_def == null)
                Sys.ERR ("Command not provided.");

            return false;
        }
        

        // Remaining are command-specific arguments
        if (! this.ProcessArgGroup (cmd_def.GetValidArgs (), null, cmd_instance.ParamValues) )              
        {
            Sys.ERR ("Processing options returned false. Aborting the command execution sequence.");
            return false;
        }

        const unprocessed_amount = this._Unprocessed?.length;
        if (unprocessed_amount > 0)
            return Sys.ERR_FATAL ("Unknown argument" + (unprocessed_amount > 1 ? "s: " : ": ") + this._Unprocessed.join () );

        // Save rest as unprocessed
        //cmd_instance.ExtraParams = [...this._Unprocessed];


        // Done.
        return true;
    }





    ProcessArgGroup (argdefs, func = null, data_obj = null)
    {
        const processed = {};
        const not_processed = [];

        while (this._Unprocessed?.length > 0)
        {            
            const arg_name = this._Unprocessed.shift ();

            Sys.DEBUG ("Argument: " + arg_name);

            const def = Arguments.GetArgDef (argdefs, arg_name);

            if (def != null)
            {
                Sys.DEBUG ("Definition found for arg '" + arg_name + "'.");

                const def_name = def.GetName ();

                if (processed [def_name] != null && !def.AllowMultiple)
                    return Sys.ERR ("Argument '" + def_name + "' given multiple times.");

                processed[def_name] = true;

                const param = def.HasParameter ? this._Unprocessed.shift () : null;                

                if (! def.InvokeArg (argdefs, param, func, data_obj) )
                    return Sys.ERR ("Error with argument '" + arg_name + "'");                
            }

            else if (arg_name.startsWith ("--") ) 
                return Sys.ERR ("Unrecognized option '"+ arg_name + "'. Aborting argument-processing process.", {src: this});
                                    
            else            
                not_processed.push (arg_name);        
            
        }
        
        this._Unprocessed = not_processed;


        // Check if any mandatory arguments are left unprocessed
        const missing_args = [];
        for (const def of argdefs.AsArray () )
        {
            if (!def.IsOptional && processed[def.GetName()] != true)
                missing_args.push (def.GetName () );
        }

        if (missing_args.length > 0)
            return Sys.ERR ("Mandatory arguments missing: " + Util.ArrayToStr (missing_args) );

        else
            return true;

    }








    /* Assumes args to be in position where the next argument is supposed to be the command. */
    __GetCommandDef (name, commands = Sys.GetMain ().GetCommandDefs () )
    {                        
        if (name == null)
            return null;

        for (const o of Object.values (commands) )
        {           
            if (o?.Matches (name) )
            {
                Sys.DEBUG ("Command handler found for '" + name + '".');

                if (o.HasSubcommands () && this.GetRemainingAmount () > 0)
                {                  
                    const subcmd = this.PeekLC ();
                    const subcommand = this.__GetCommandDef (subcmd, o.GetSubcommands () )

                    if (subcommand != null)
                    {
                        Sys.DEBUG ("Found a subcommand-handler for  '" + subcommand + '".');
                        this.GetNext ();                      
                        return subcommand;                    
                    }
                }
                return o;        
            }
        }
        
        Sys.DEBUG ("No command-handler found for '" + name + "'");        
        return null;
    }


}


module.exports = Arguments;