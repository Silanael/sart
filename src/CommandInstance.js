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
const Arguments      = require ("./ArgumentDef");
const SARTObject     = require ("./SARTObject");
const COMMANDS       = require ("./COMMANDS");
const OPTIONS        = require ("./OPTIONS");
const SETTINGS       = require ("./SETTINGS").SETTINGS;
const OutputParams   = require ("./OutputParams");







class CommandInstance extends SARTObject
{
    CDef           = null;
    
    CommandName    = null;    
    Arguments      = null;
    ArgumentValues = {};

    OutputObject   = null;
    OutputParams   = null;

    Config         = new Settings.Config ();
    FileOutputDest = null;
    OutputDests    = [];

    WantedFields   = null;
    WantedListMode = null;

    StartTime      = null;
    EndTime        = null;
    Fetches        = 0;

    Success        = null;
    Failed         = null;




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
    GetEffectiveSetting  (key)         { return Sys.GetMain ()?.GetSetting   (key);     }
    GetEffectiveSettingOr(key, val)    { return Sys.GetMain ()?.GetSettingOr (key, val);}
    GetConfig            ()            { return this.Config;                            }
    GetArguments         ()            { return this.Arguments;                         }
    GetArgumentsAmount   ()            { return this.Arguments != null ? this.Arguments.GetTotalAmount () : 0; }
    GetNextUnhandledArg  ()            { return this.Arguments?.GetNext   ();  }
    GetNextUnhandledArgLC()            { return this.Arguments?.GetNextLC ();  }
    GetNextUnhandledArgUC()            { return this.Arguments?.GetNextLC ();  }
    PeekNextUnhandledArg ()            { return this.Arguments?.Peek ();       }
    GetArgumentValueByName(arg_name)   { return this.ArgumentValues[arg_name]; }    
    GetArgumentValues    ()            { return this.ArgumentValues;           }    
    RequireAmount        (amount, msg) { return this.Arguments != null ? this.Arguments.RequireAmount (amount, msg) : false; }
    GetOutputDests       ()            { return this.FileOutputDest != null ? this.FileOutputDest : Sys.OUTPUTDEST_STDOUT; }
    GetFileOutputDest    ()            { return this.FileOutputDest;         }
    HasWantedFields      ()            { return this.WantedFields != null;   }
    GetWantedFields      ()            { return this.WantedFields;           }    
    HasListMode          ()            { return this.WantedListMode != null; }
    GetListMode          ()            { return this.WantedListMode;         }
    HasOutputParams      ()            { return this.OutputParams != null;   }
    GetOutputParams      ()            { return this.OutputParams;           }
    AddOutputParams      ()            { this.OutputParams = new OutputParams ().WithCMD (this); return this.OutputParams; }
    SetOutputObject      (sobj)        { this.OutputObject = sobj; }
    GetOutputObject      ()            { return this.OutputObject; }

    GetEffectiveListMode ()            { return this.CDef.GetEffectiveListMode (this); }
    GetEffectiveFields   ()            { return this.CDef.GetEffectiveFields   (this); }

    __OnFetchExecuted    (fetch)       { ++this.Fetches; }
    

    AppendConfigToGlobal ()            
    { 
        if (! Sys.GetMain ()?.GetGlobalConfig ()?.AppendSettings (this.GetConfig () ) )
            return this.OnProgramError ("Failed to append command-config into the global config!");
        else
            return true;
    }


    GetCommandDefFromArgs (args)
    {
        let cmd_name = args.GetNextLC ();
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

                args = new Arguments ([default_param]);  
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




    async Execute (args)
    {
        if (args == null)
            return Sys.ERR_PROGRAM ("Execute: 'args' null!", this);

        this.Arguments = args;
        this.Success   = false;
        this.Fetches   = 0;
        this.Config    = new Settings.Config ().WithName ("Command");


        // Extract options and get the remaining arguments
        if (! args.ProcessArgs (OPTIONS.OPTIONS, this.__OnOptionArg ) )
        {
            Sys.DEBUG ("Processing options returned false. Aborting the command execution sequence.");
            return false;
        }

        this.OutputDests = [ ]

        // Get command-handler
        this.CDef = this.GetCommandDefFromArgs (args);
        
        if (this.CDef == null)
            return false;


        else if (this.GetArgumentsAmount () < this.CDef.GetMinArgsAmount () )
        {
            this.CDef.DisplayHelp ();
            return Sys.ERR ("Insufficient arguments for the command '" + this.CDef + "' - at least " + this.CDef.GetMinArgsAmount () + " required.");
        }
        
    
        // Good to go
        else
        {               
            Sys.VERBOSE ("Processing command's arguments (" + this.GetArgumentsAmount () + ")...");         

            // Rest are arguments
            if (! args.ProcessArgs (this.CDef.ValidArgs, this.__OnCommandArg) )
            {
                Sys.DEBUG ("Processing command's ValidArgs returned false. Aborting the command execution sequence.");
                return false;
            }

            // Open output-file if need be
            const filename_out = this.GetSetting (SETTINGS.OutputFilename);
            if (filename_out != null)
            {
                this.FileOutputDest = new Sys.OutputDest_File (filename_out);
                this.GetConfig ().SetSetting (SETTINGS.OutputFileDest, this.FileOutputDest);
                this.OutputDests = [ this.FileOutputDest ];
            }
            else
                this.OutputDests = [ Sys.OUTPUTDEST_STDOUT ]; // TODO move.


            
            Sys.VERBOSE ("Executing command '" + this.CDef + "'...");         
                        
            if (!this.CDef.RunAsActiveCommand () )
                State.ActiveCommandInst = null;


            // Open the output file if any.
            const filename = this.GetSetting (SETTINGS.OutputFilename);
            if (filename != null)
                this.FileOutputDest = new Sys.OutputDest_File (filename);


            // Execute
            this.StartTime = Util.GetUNIXTimeMS ();        
            this.Success   = await this.CDef.OnExecute (this);  
            this.EndTime   = Util.GetUNIXTimeMS ();       


            // Output
            this.CDef.OnOutput (this);
            

            // Close file if one was opened.
            if (this.FileOutputDest != null)
                this.FileOutputDest.Done ();


            Sys.VERBOSE ("");        
            Sys.VERBOSE ("Command finished in " + this.GetRuntimeSec () + " sec with " + Util.AmountStr (this.Fetches, "fetch", "fetches") + "." );
        } 

        return this.Success;
    }

    __OnOptionArg (argdef, argname, param)
    {
        console.log (this);
        //this.Config.SetSetting (argdef.Key, argdef.Value != null ? argdef.Value : param);
        return true;
    }

    __OnCommandArg (argdef, argname, param)
    {
        this.ArgumentValues[argname] = param != null ? param : true;
        return true;
    }


}













async function RunCommand (main, args)
{

    if (State.ActiveCommandInst != null)
        return Sys.ERR_ABORT ("A command is already running.");

    else
    {      
        const cmd = new CommandInstance (main);
        
        State.ActiveCommandInst   = cmd;
    
        await cmd.Execute (args);

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
            
            if (args != null && o.HasSubcommands () && args.GetRemainingAmount () > 0)
            {
                const scname = args.Peek ();                

                if (scname != null)
                {
                    const subcommand = GetCommandDef (scname, o.GetSubcommands ())

                    if (subcommand != null)
                    {
                        Sys.DEBUG ("Found a subcommand-handler for  '" + scname + '".');
                        args.GetNext ();
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