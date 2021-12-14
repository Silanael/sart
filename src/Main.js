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
const Package       = require ("../package.json");

const Constants     = require ("./CONSTANTS.js");
const COMMANDS      = require ("./COMMANDS");
const ProgramState  = require ("./ProgramState.js");
const Arguments     = require ("./Arguments");
const Concurrent    = require ("./Concurrent");
const Cache         = require ("./Cache");
const Command       = require ("./Command");
const Sys           = require ('./System.js');
const Settings      = require ('./Config.js');
const Util          = require ('./Util.js');

const FS            = require ("fs");


// Constants
const PRG_ARG           = 0;
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;


class Main
{    
    State = ProgramState;
    
    async Init (argv)
    {
        Sys.Main = this;

        // Set a generic exception handler
        process.on ("uncaughtException", Sys.ErrorHandler);

        this.State.Main = this;

        await this.RunCommand (new Arguments.Args (argv.slice (FIRST_ARG)) );
    }

    async RunCommand (args)
    {
        await Command.RunCommand (this, args);
    }

    GetCommandDef    (cmd_name)   { return Command.GetCommandDef (cmd_name); }
    GetGlobalConfig  ()           { return ProgramState.GlobalConfig;   }
    SetGlobalSetting (key, value) { return ProgramState.GlobalConfig.SetSetting (key, value); }
    ExitConsole      ()           { ProgramState.ConsoleActive = false; }

      
    GetSetting (key)
    {                
        if (this.State.ActiveCommandInst != null && this.State.ActiveCommandInst.HasSetting (key) )
            return this.State.ActiveCommandInst.GetSetting (key);
          
        else if (this.State.GlobalConfig != null)
            return this.State.GlobalConfig.GetSetting (key); 
          
        else
            return null;
    }

}






function SetSetting (args)
{

    if (!args.RequireAmount (2, "USAGE: SET config-key value") )
        return false;
    
    const key   = args.Pop ();
    const value = args.Pop ();

    return Settings.SetConfigKey (key, value);        
}


function Handler_LoadConfig (arg)
{
    const console_active = ProgramState.IsConsoleActive ();
    const success = Settings.LoadConfig (arg);
    
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
