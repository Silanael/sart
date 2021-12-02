//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_console.js - 2021-10-19_01
// Command 'console'
//

// External imports
const TTY      = require ('tty');
const FS       = require ('fs');
const ReadLine = require ('readline');


// Imports
const Constants = require ("../CONST_SART.js");
const State     = require ("../ProgramState.js");
const Sys      = require ('../System.js');
const Settings = require ('../Settings.js');
const Util     = require ('../Util.js');
const Arweave  = require ('../Arweave.js');
const ArFS     = require ('../ArFS.js');


// Constants
const ANSI_CLEAR  = "\033[0m";
const ANSI_SAFE   = ANSI_CLEAR;
const ANSI_UNSAFE = "\033[31;1m";



// Variables
let Running = false;
let Main;


async function HandleCommand (args)
{    
    Sys.VERBOSE ("Entering the Command Interface.")

    if (State.ConsoleActive == true)
    {
        Sys.ERR ("Console already running.")
        return false;
    }
    State.ConsoleActive = true;


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
                // This is a bit of a hack prior to moving 
                // the command parsing logic to its own module.            
                argv.unshift ("bar");
                argv.unshift ("foo");
            
                await Main (argv);
            }
        }

        PrintPrompt ();
    }
    
    input.close ();
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

    if (Settings.IsANSIAllowed () )
        prompt = ANSI_SAFE + prompt + ANSI_CLEAR;

    Sys.OUT_TXT_RAW (prompt);
}
//const Search   = require ('./cmd_search.js');



function PrintInfoMessage ()
{    
    const now = new Date ();

    if (now.getMonth () * 32 + now.getDate () == 340)
        Sys.INFO (Buffer.from ("52656D656D626572207468652046616C6C656E2E", 'hex').toString () );    

    else
        PrintLine ("!!! DEVELOPMENT VERSION !!!")    

    PrintEmptyLine ();
    
    
        
}

function PrintBanner ()
{
    let text = "*************************\n"
             + "* SILANAEL ARWEAVE TOOL *\n"
             + "*************************\n"
             + Util.GetVersionStr () + "\n\n"             

    if (Settings.IsANSIAllowed () )
        text = ANSI_SAFE + text + ANSI_CLEAR;   
        
    Sys.OUT_TXT_RAW (text);
}




function SetMain (main)
{
    Main = main;
}



module.exports = { HandleCommand, SetMain };