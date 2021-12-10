// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Command.js - 2021-12-07_01
//
// The command-instance.
//

const Constants      = require ("./CONST_SART");
const SARTObject     = require ("./SARTObject");
const State          = require ("./ProgramState");
const Util           = require ("./Util");
const Sys            = require ("./System");
const Settings       = require ("./Settings");
const Args           = require ("./Arguments");
const Options        = require ("./Options");
const COMMANDS       = require ("./COMMANDS");


class Command extends SARTObject
{
    Handler   = null;
    
    Command   = null;    
    ArgV      = null;

    Config    = new Settings.Config ();

    StartTime = null;
    EndTime   = null;
    Fetches   = 0;

    Success   = null;
    Failed    = null;




    GetConfig          ()       { return this.Config; }

    /** Gets the time the task took. Call after completion. */
    GetDurationMs      ()       { return this.StartTime != null && this.EndTime != null ? this.EndTime - this.StartTime : null }
    GetDurationSec     ()       { return this.GetDurationMs () / 1000; }

    /* Gets the duration if the task is completed, current runtime otherwise. */
    GetRuntimeMs       ()       { return this.StartTime != null ? (this.EndTime != null ? this.EndTime : Util.GetUNIXTimeMS () ) - this.StartTime : null };
    GetRuntimeSec      ()       { return this.GetRuntimeMs () / 1000; }

    IncrementFetchesBy (amount) { this.Fetches += amount;                        }
    GetFetchesAmount   ()       { return this.Fetches != null ? this.Fetches : 0 }
    WasSuccessful      ()       { return this.Success;                           }


    async Execute (argv, is_first_command = false)
    {
        this.ArgV    = argv;
        this.Success = false;
        this.Fetches = 0;
        this.Config  = new Settings.Config ();

        if (!is_first_command && (argv == null || argv.length <= 0) )
            return this.Failed = Sys.ERR_PROGRAM ("Execute: 'argv' null!", this);
                    



        // Extract options and get the remaining arguments
        let args = this.ParseOptions (argv);



        this.Command  = args.PopLC ();
        
        // No command given
        if (this.Command == null)
        {
            // Use the default-command if this is the first command (ie. not a comman from the console).
            if (is_first_command)
            {            
                const default_cmd   = Settings.GetSetting (Constants.SETTINGS.DefaultCommand);            
                const default_param = Settings.GetSetting (Constants.SETTINGS.DefaultCommandParam);
                
                if (default_cmd == null)
                {
                    Sys.WARN ("Default command set in config is null - defaulting to 'console'.");
                    default_cmd = "console";
                }
                this.Command = default_cmd;            
                args = new Args ([default_param]);  
            }
            else
                return this.Failed = Sys.ERR ("ExecuteCommand: No command given.", this);
        }



        
        // Get the handler for the command
        this.Handler = COMMANDS.GetCommandHandler (this.Command);

        if (this.Handler == null)
            return this.Failed = Sys.ERR ("Command '" + this.Command + "' not recognized or handler missing.", this);
        
        else if (args.GetAmount () < this.Handler.MinArgsAmount)
        {
            this.Handler.DisplayHelp ();       
            return this.Failed = Sys.ERR ("Insufficient amount of parameters given - at least " + this.Handler.MinArgsAmount + " required.");
        }



        // All fine, execute the command.
        else
        {            
            let handler = this.Handler;

            Sys.VERBOSE ("Executing command '" + this.Command + "'...");
            this.StartTime = Util.GetUNIXTimeMS ();        

            if (handler.OnExecute != null)
            {
                const subcmd = handler.GetSubcommand (args.Peek () );
                
                // Subcommand present, invoke that.
                if (subcmd != null)
                {
                    Sys.DEBUG ("Executing subcommand-handler '" + subcmd + "' ...");
                    args.Pop ();
                    handler = subcmd;                    
                }
                
                this.Success = await handler.OnExecute (args, this);            
            }
            else
            {
                Sys.DEBUG ("Executing command '" + this.Command + "' as a direct function..");
                this.Success = await handler (args, this);
            }
            
            this.EndTime = Util.GetUNIXTimeMS ();        COMMANDS

            if (handler.OnOutput != null)
                handler.OnOutput (args, this);

            Sys.VERBOSE ("");        
            Sys.VERBOSE ("Command finished in " + this.GetRuntimeSec () + " sec with " + Util.AmountStr (this.Fetches, "fetch", "fetches") + "." );
        } 


    }


    ParseOptions (argv)
    {
        if (argv == null)
        {
            Sys.ERR_PROGRAM ("'argv' null!", "Command.ParseOptions");
            return null;
        }
        
        const len = argv.len;
        let index = 0;
        
        const command_args = [];
        
        for (const w of argv)
        {
            const invoked = Options.InvokeOptionIfExists (this.Config, w, ++index < len ? argv[index] : null)
            
            if (invoked != null)
            {
                // Skip over the parameter.
                if (invoked.HasParameter)
                    ++index;
            }
            else if (w.startsWith ("--") )            
            {
                Sys.ERR ("Unrecognized option '" + w + "'. Aborting.");
                return null;
            }
                                            
            else
                command_args.push (w);
        }
        
        return new Args (command_args);
    }
    
  

}






async function RunCommand (main, argv)
{

    if (State.ActiveCommand != null)
        return this.OnError ("A command is already running.");

    else
    {      
        const cmd      = new Command (main);
        const is_first = State.PreviousCommand == null;
        
        State.ActiveCommand   = cmd;
        State.PreviousCommand = cmd;

        await State.ActiveCommand.Execute (argv, is_first);

        State.ActiveCommand   = null;
    }
}










module.exports = { Command, RunCommand };