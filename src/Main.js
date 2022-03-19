#!/usr/bin/env node 
//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// (I'm great at naming things, I know)
//
// main.js - 2021-10-16_01
//


// Imports
const FS            = require ("fs");

const Package       = require ("../package.json");

const Constants     = require ("./CONSTANTS.js");
const COMMANDS      = require ("./COMMANDS");
const ProgramState  = require ("./ProgramState.js");
const Arguments     = require ("./Arguments");
const Concurrent    = require ("./Concurrent");
const Cache         = require ("./Cache");
const Command       = require ("./CommandInstance");
const Sys           = require ('./System.js');
const Config        = require ('./Config.js');
const SETTINGS      = require ("./SETTINGS").SETTINGS;
const Util          = require ('./Util.js');
const Arweave       = require ("./Arweave/Arweave");
const SARTGroup     = require ("./SARTGroup");
const OutputF_TXT   = require ("./OutputFormats/OutputFormat_TXT");
const OutputF_JSON  = require ("./OutputFormats/OutputFormat_JSON");
const OutputF_CSV   = require ("./OutputFormats/OutputFormat_CSV");
const OutputFormat  = require ("./OutputFormat");
const OutputParams  = require ("./OutputParams");





// Constants
const PRG_ARG           = 0;
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;


class Main
{    
    State = ProgramState;
    OutputFormats = 
    {
        TXT:  new OutputF_TXT  (),
        JSON: new OutputF_JSON (),
        CSV:  new OutputF_CSV  (),
    }
    
    async Init (argv)
    {
        Sys.SetMain (this);

        // Set a generic exception handler
        process.on ("uncaughtException", Sys.ErrorHandler);

        this.State.Main = this;

        await this.RunCommand (new Arguments (argv.slice (FIRST_ARG) ) );
    }

    async RunCommand (args)
    {
        await Command.RunCommand (this, args);
    }

    GetCommandDef         (cmd_name, args)   { return Command.GetCommandDef (cmd_name, null, args); }
    GetGlobalConfig       ()                 { return ProgramState.GlobalConfig;   }
    SetGlobalSetting      (key, value)       { return ProgramState.GlobalConfig.SetSetting (key, value); }
    ExitConsole           ()                 { ProgramState.ConsoleActive = false; }
    GetArweave            ()                 { return Arweave; }
    GetFileOutputDest     ()                 { return ProgramState.ActiveCommandInst?.GetFileOutputDest (); }  
    //GetOutputDests        ()           { return Util.Or (ProgramState.ActiveCommandInst?.GetOutputDests (), Sys.OUTPUTDESTS_STDOUT ); }
    GetOutputDests        ()                 { return Sys.OUTPUTDESTS_STDOUT; }
    GetOutputFormat       (fmt_name)         { return this.OutputFormats[fmt_name?.toUpperCase () ]; }
    GetActiveOutputFormat ()                 { return this.GetOutputFormat (this.GetSetting (SETTINGS.OutputFormat) ); }
    GetSizeStr            (bytes, hr)        { return Util.GetSizeStr (bytes, hr, hr ? this.GetSetting (SETTINGS.SizeDigits) : null); }
    GetActiveCommand      ()                 { return this.State.ActiveCommandInst; }

    GetSetting (key)
    {                
        if (this.State.ActiveCommandInst != null && this.State.ActiveCommandInst.HasSetting (key) )
            return this.State.ActiveCommandInst.GetSetting (key);
          
        else if (this.State.GlobalConfig != null)
            return this.State.GlobalConfig.GetSetting (key); 
          
        else
            return null;
    }
    
    GetSettingOr (key, value_if_null)
    {
        const value = this.GetSetting (key);
        return value != null ? value : value_if_null;
    }

    OutputObjects (objs, args = new OutputParams () )
    {     
        const fmt_handler = this.GetActiveOutputFormat ();
                
        if (fmt_handler == null)
            return Sys.ERR_PROGRAM_ONCE ("No suitable output-handler found!");
        
        else
        {            
            fmt_handler.OutputObjects (objs instanceof SARTGroup ? objs : new SARTGroup ().With (objs), args);
            return true;
        }        
    }
    

}






function SetSetting (args)
{

    if (!args.RequireAmount (2, "USAGE: SET config-key value") )
        return false;
    
    const key   = args.Pop ();
    const value = args.Pop ();

    return Config.SetConfigKey (key, value);        
}


function Handler_LoadConfig (arg)
{
    const console_active = ProgramState.IsConsoleActive ();
    const success = Config.LoadConfig (arg);
    
    if (!success && !console_active)
        Sys.EXIT (-1);

    return success;
}




function DisplayReadme ()
{
    try
    {
        Sys.INFO (FS.readFileSync (__dirname + "/../README.md", "utf-8" ));
    }
    catch (exception)
    {
        Sys.ON_EXCEPTION (exception, "DisplayReadme");
        Sys.ERR ("Couldn't open README.md. How lame is that.");
    }
}





async function Testing (argv)
{ 
    
    
    const arfs_entity = require ("./ArFSEntity");
    const entity = arfs_entity.GET_ENTITY ( {entity_type: argv.PopLC (), arfs_id: argv.Pop() } )

    const st = Util.GetUNIXTimeMS ();
    await entity.FetchAll ();
    const tt = Util.GetUNIXTimeMS () - st;

    entity.Output ();
    Sys.INFO ("Time taken: " + (tt / 1000) + " sec.");
    
    /*
    const task = new TestTask ();
    
    Sys.INFO ("Starting task");
    await task.Execute ();
    Sys.INFO ("TASK DONE");
    */

}







// Entrypoint
new Main ().Init (process.argv);
