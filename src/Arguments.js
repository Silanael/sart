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
    
    
    ProcessArgs () 
    {

        if (this._Argv == null) 
        {
            Sys.ERR_PROGRAM ("Arguments: _Argv null!", this);                             
            return null;
        }

        const commandsetup =
        {
            Command           : null,
            Config            : new Config (),
            ParamValues       : {},
            UnprocessedParams : null
        };

        Sys.DEBUG ("Starting to process " + this.GetRemainingAmount () + " arguments..");
        
        
        // Process options if any
        if (! this.__ProcessArgGroup (Sys.GetMain ().GetOptions (), 
              (def, param) => commandsetup.Config.SetSetting (def.Key, param != null ? param : def.Value) )  )
        {
            Sys.ERR ("Processing options returned false. Aborting the command execution sequence.");
            return null;
        }

        // The next unprocessed agrument should be the command
        commandsetup.CommandName = this.GetNextLC ();
        commandsetup.Command     = this.__GetCommandDef (commandsetup.CommandName);

        if (commandsetup.Command == null)
        {
            if (commandsetup.CommandName == null)
                Sys.ERR ("Command not provided.");

            return null;
        }
        

        // Remaining are command-specific arguments
        if (! this.__ProcessArgGroup (commandsetup.Command.GetValidArgs (), null, commandsetup.ParamValues) )              
        {
            Sys.ERR ("Processing options returned false. Aborting the command execution sequence.");
            return null;
        }


        // Save rest as unprocessed
        commandsetup.UnprocessedParams = [...this._Unprocessed];


        // Done.
        return commandsetup;
    }





    __ProcessArgGroup (argdefs, func = null, data_obj = null)
    {
        const not_processed = [];


        while (this._Unprocessed?.length > 0)
        {            
            const arg_name = this._Unprocessed.shift ();

            Sys.DEBUG ("Argument: " + arg_name);

            const def = Arguments.GetArgDef (argdefs, arg_name);

            if (def != null)
            {
                Sys.DEBUG ("Definition found for arg '" + arg_name + "'.");

                const param = def.HasParameter ? this._Unprocessed.shift () : null;                

                if (! def.InvokeArg (argdefs, param, func, data_obj) )
                    return Sys.ERR ("Error with argument '" + arg_name + "'");                
            }

            else if (arg_name.startsWith ("--") ) 
                return Sys.ERR ("Unrecognized option '"+ arg_name + "'. Aborting argument-processing process.", "ProcessArgs");
                                    
            else            
                not_processed.push (arg_name);        
            
        }

        this._Unprocessed = not_processed;

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