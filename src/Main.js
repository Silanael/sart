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
const Package    = require ("../package.json");

const Constants  = require ("./CONSTANTS.js");
const COMMANDS   = require ("./CONST_COMMANDS");
const State      = require ("./ProgramState.js");

const Concurrent = require ("./Concurrent");
const Cache      = require ("./Cache");
const Command    = require ("./Command");
const Sys        = require ('./System.js');
const Settings   = require ('./Settings.js');
const Util       = require ('./Util.js');


const FS          = require ("fs");


// Constants
const PRG_ARG           = 0;
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;


class Main
{    
    State    = State;
    Commands = COMMANDS;

    async Init (argv)
    {
        // Set a generic exception handler
        process.on ("uncaughtException", Sys.ErrorHandler);

        this.State.Main = this;

        const args = argv.slice (FIRST_ARG);
        await Command.RunCommand (this, args);
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
    const console_active = State.IsConsoleActive ();
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
