// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Command.js - 2021-12-07_01
//
// Contains the command-instance and supporting functions.
//

const Sys            = require ("./System");
const Util           = require ("./Util");
const Constants      = require ("./CONSTANTS");
const State          = require ("./ProgramState");
const Settings       = require ("./Config");
const Args           = require ("./Arguments");
const SARTObject     = require ("./SARTObject");
const COMMANDS       = require ("./COMMANDS");
const OPTIONS        = require ("./OPTIONS");










class CommandInstance extends SARTObject
{
    CDef        = null;
    
    CommandName = null;    
    ArgV        = null;
    Arguments   = null;

    Config      = new Settings.Config ();

    StartTime   = null;
    EndTime     = null;
    Fetches     = 0;

    Success     = null;
    Failed      = null;




    /** Gets the time the task took. Call after completion. */
    GetDurationMs        ()            { return this.StartTime != null && this.EndTime != null ? this.EndTime - this.StartTime : null }
    GetDurationSec       ()            { return this.GetDurationMs () / 1000; }

    /* Gets the duration if the task is completed, current runtime otherwise. */
    GetRuntimeMs         ()            { return this.StartTime != null ? (this.EndTime != null ? this.EndTime : Util.GetUNIXTimeMS () ) - this.StartTime : null };
    GetRuntimeSec        ()            { return this.GetRuntimeMs () / 1000; }
  
    IncrementFetchesBy   (amount)      { this.Fetches += amount;                        }
    GetFetchesAmount     ()            { return this.Fetches != null ? this.Fetches : 0 }
    WasSuccessful        ()            { return this.Success;                           }
  
    GetCommandName       ()            { return this.CommandName;                       }
    HasSetting           (key)         { return this.Config.HasSetting (key);           }
    GetSetting           (key)         { return this.Config.GetSetting (key);           }
    GetConfig            ()            { return this.Config;                            }
    GetArgsAmount        ()            { return this.Arguments != null ? this.Arguments.GetAmount () : 0; }
    Pop                  ()            { return this.Arguments?.Pop   ();  }
    PopLC                ()            { return this.Arguments?.PopLC ();  }
    PopUC                ()            { return this.Arguments?.PopLC ();  }
    Peek                 ()            { return this.Arguments?.Peek ();  }
    RequireAmount        (amount, msg) { return this.Arguments != null ? this.Arguments.RequireAmount (amount, msg) : false; }
    

    AppendConfigToGlobal ()            
    { 
        if (! this.GetMain ()?.GetGlobalConfig ()?.AppendSettings (this.GetConfig () ) )
            return this.OnProgramError ("Failed to append command-config into the global config!");
        else
            return true;
    }


    GetCommandDefFromArgs (args)
    {
        let cmd_name = args.PopLC ();
        let def      = null;
                

        // No command given
        if (cmd_name == null)
        {
            // Use the default-command if this is the first command (ie. not a comman from the console).
            if (State.PreviousCommandInst == null)
            {            
                const default_cmd   = Constants.COMMAND_DEFAULT;
                const default_param = Constants.COMMAND_DEFAULT_ARGS;

                if (default_cmd == null)
                {
                    Sys.ERR_PROGRAM ("Default command set in constants is null - defaulting to 'console'.");
                    cmd_name = "console";
                }
                else
                    cmd_name = default_cmd;            

                args = new Args ([default_param]);  
            }
            else
            {
                this.Failed = Sys.ERR ("ExecuteCommand: No command given.", this);
                return null;
            }
        }
        
        this.CommandName = cmd_name;
        

        def = GetCommandDef (cmd_name, COMMANDS, args);
        
        if (def == null)
            this.Failed = Sys.ERR ("Command '" + cmd_name + "' not recognized or definition missing.", this);
        

        return def;
    }




    async Execute (argv)
    {
        this.ArgV    = argv;
        this.Success = false;
        this.Fetches = 0;
        this.Config  = new Settings.Config ().WithName ("Command");


        // Extract options and get the remaining arguments
        this.Arguments = OPTIONS.ParseOptions (argv, this.Config);
        

        // Get command-handler
        this.CDef = this.GetCommandDefFromArgs (this.Arguments);
        
        if (this.CDef == null)
            return false;

        else if (this.GetArgsAmount () < this.CDef.GetMinArgsAmount () )
        {
            this.CDef.DisplayHelp ();
            Sys.ERR ("Insufficient arguments for the command '" + this.CDef + "' - at least " + this.CDef.GetMinArgsAmount () + " required.");
        }
            
        // Good to go
        else
        {   
            Sys.VERBOSE ("Executing command '" + this.CDef + "'...");         
                        
            if (!this.CDef.RunAsActiveCommand () )
                State.ActiveCommandInst = null;

            // Execute
            this.StartTime = Util.GetUNIXTimeMS ();        
            this.Success   = await this.CDef.OnExecute (this);  
            this.EndTime   = Util.GetUNIXTimeMS ();       

            this.CDef.OnOutput (this);
            
            Sys.VERBOSE ("");        
            Sys.VERBOSE ("Command finished in " + this.GetRuntimeSec () + " sec with " + Util.AmountStr (this.Fetches, "fetch", "fetches") + "." );
        } 

        return this.Success;
    }



}













async function RunCommand (main, argv)
{

    if (State.ActiveCommandInst != null)
        return Sys.ERR_ABORT ("A command is already running.");

    else
    {      
        const cmd = new CommandInstance (main);
        
        State.ActiveCommandInst   = cmd;
    
        await cmd.Execute (argv);

        State.PreviousCommandInst = cmd;
        State.ActiveCommandInst   = null;
    }
}





function GetCommandDef (name, commands = null, args = null)
{    
    if (commands == null)
        commands = COMMANDS;
    

    if (name == null)
        return null;


    for (const o of Object.values (commands) )
    {           
                      
        if (o?.Matches (name) )
        {
            Sys.DEBUG ("Command handler found for '" + name + '".');
            
            if (args != null && o.HasSubcommands () && args.GetAmount () > 0)
            {
                const scname = args.Peek ();                

                if (scname != null)
                {
                    const subcommand = GetCommandDef (scname, o.GetSubcommands ())

                    if (subcommand != null)
                    {
                        Sys.DEBUG ("Found a subcommand-handler for  '" + scname + '".');
                        args.Pop ();
                        return subcommand;
                    }
                    else
                    {
                        const custom_cmd = o.GetCustomSubCommand (args.Peek () );
                        if (custom_cmd != null)
                            return custom_cmd;
                    }
                }
            }
            return o;        
        }
    }
    Sys.DEBUG ("No command-handler found for '" + name + "'");
    return null;
}










module.exports = { CommandInstance, RunCommand, GetCommandDef }