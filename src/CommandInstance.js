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
const State          = require ("./ProgramState");
const Settings       = require ("./Config");
const SARTObject     = require ("./SARTObject");
const SETTINGS       = require ("./SETTINGS").SETTINGS;
const OutputParams   = require ("./OutputParams");







class CommandInstance extends SARTObject
{
    CDef            = null;
    
    CommandName     = null;    
    Arguments       = null;
    ParamValues     = {};

    OutputObject    = null;
    OutputParams    = null;

    Config          = new Settings.Config ();
    FileOutputDest  = null;
    OutputDests     = [];

    WantedFields    = null;
    WantedListMode  = null;

    ActiveOperation = null;

    StartTime       = null;
    EndTime         = null;
    Fetches         = 0;

    Success         = null;
    Failed          = null;




    /** Gets the time the task took. Call after completion. */
    GetDurationMs        ()            { return this.StartTime != null && this.EndTime != null ? this.EndTime - this.StartTime : null }
    GetDurationSec       ()            { return this.GetDurationMs () / 1000; }

    /* Gets the duration if the task is completed, current runtime otherwise. */
    GetRuntimeMs         ()            { return this.StartTime != null ? (this.EndTime != null ? this.EndTime : Util.GetUNIXTimeMS () ) - this.StartTime : null };
    GetRuntimeSec        ()            { return this.GetRuntimeMs () / 1000; }
  
    IncrementFetchesBy   (amount)      { this.Fetches += amount;                        }
    GetFetchesAmount     ()            { return this.Fetches != null ? this.Fetches : 0 }
    WasSuccessful        ()            { return this.Success;                           }
    IsOperationActive    ()            { return this.ActiveOperation != null;           }
  
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
    GetParamValueByName  (arg_name)    { return this.ParamValues[arg_name]; }    
    GetParamValueByDef   (argdef)      { return argdef?.GetValueFromDataObj (this.ParamValues); }    
    GetParamValues       ()            { return this.ParamValues;           }    
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


  



    async Execute (args)
    {
        if (args == null)
            return Sys.ERR_PROGRAM ("Execute: 'args' null!", this);

        this.Arguments = args;
        this.Success   = false;
        this.Fetches   = 0;

            

        const command_setup = args.ProcessArgs ();
        if (command_setup != null)
        {
            this.Config      = command_setup.Config;
            this.CDef        = command_setup.Command;
            this.ParamValues = command_setup.ParamValues;
            this.ExtraParams = command_setup.UnprocessedParams;                     
        }
        else
            return Sys.ERR ("Failed to process arguments - aborting command execution.");
        
    

        this.OutputDests = [ ]

  
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


        return this.Success;
    }

    StartOperation (operation)
    {
        if (this.IsOperationActive () )
            return Sys.ERR_PROGRAM ("An operation was already active while trying to start '" + operation?.toString() + "'");

        this.ActiveOperation = operation;
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












module.exports = { CommandInstance, RunCommand }