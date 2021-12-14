//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_console.js - 2021-10-19_01
// Command 'CONSOLE'
//

// External imports
const TTY        = require ('tty');
const FS         = require ('fs');
const ReadLine   = require ('readline');


// Imports
const Package    = require ("../../package.json");
const Constants  = require ("../CONSTANTS.js");
const State      = require ("../ProgramState.js");
const Sys        = require ('../System.js');
const Settings   = require ('../Config.js');
const Util       = require ('../Util.js');
const Arweave    = require ('../Arweave/Arweave.js');
const ArFS       = require ('../ArFS/ArFS.js');
const Arguments  = require ("../Arguments");
const CommandDef = require ("../CommandDef").CommandDef;






class CMD_Console extends CommandDef
{
    constructor ()
    {
        super ("CONSOLE");
        this.MinArgsAmount = 0;
        this.AsActiveCommand = false;
    }

    async OnExecute (cmd_instance)
    {
        Sys.VERBOSE ("Entering the Command Interface.")
                
        if (State.ConsoleActive == true)
        {
            Sys.ERR ("Console already running.")
            return false;
        }
        State.ConsoleActive = true;
    
        // Append the command config to the global one
        cmd_instance.AppendConfigToGlobal ();
    

        // Banner
        PrintBanner ();
    
        // Info message
        PrintInfoMessage ();
    
        PrintPrompt    ();
    

        const input = ReadLine.createInterface ( {input: process.stdin, output: null} );
    
        for await (const line of input)
        {        
            if (line == null || line.trim () == "")
                Sys.ERR ("No command given.");
            
            else
            {
                let argv = line.split (" ");        
                
                if (Util.ContainsString (">", argv, false, true) )
                    Sys.ERR ("Redirecting into a file from the console not yet supported.");
    
                else
                {
                    await cmd_instance.GetMain ().RunCommand (new Arguments.Args (argv) );

                    if (!State.ConsoleActive)
                        break;
                }
            }
    
            PrintPrompt ();
        }
        
        input.close ();
        return true;      
    }

    OnOutput (cmd_instance)
    {
    }
}





function PrintLine (str)
{
    Sys.OUT_TXT (str);
}


function PrintEmptyLine ()
{
    Sys.OUT_TXT ("");
}


function PrintPrompt ()
{
    let prompt = "SART> ";

    Sys.OUT_TXT_RAW (prompt);
}
//const Search   = require ('./cmd_search.js');



function PrintInfoMessage ()
{    
    const now = new Date ();

    if (now.getMonth () * 32 + now.getDate () == 340)
        Sys.INFO (Buffer.from ("52656D656D626572207468652046616C6C656E2E", 'hex').toString () );    

    else if (Package.versiontype == "dev")
        PrintLine (Sys.ANSIRED ("!!! DEVELOPMENT VERSION !!!") );

    else if (Package.versiontype == "testing")
        PrintLine (Sys.ANSIYELLOW ("TESTING-VERSION") );

    PrintEmptyLine ();
    
    
        
}

function PrintBanner ()
{
    let text = 
               "*************************\n"
             + "* SILANAEL ARWEAVE TOOL *\n"
             + "*************************\n"
             
        
    Sys.OUT_TXT_RAW (Sys.ANSIRED (text) );
    Sys.INFO        (Util.GetVersionStr () );
    Sys.INFO        ("");
}





module.exports = CMD_Console