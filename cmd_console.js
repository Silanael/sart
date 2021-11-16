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
const ReadLine = require ('node:readline');


// Imports
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Util     = require ('./util.js');
const Arweave  = require ('./arweave.js');
const ArFS     = require ('./ArFS.js');


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

    if (Settings.ConsoleActive)
    {
        Sys.ERR ("Console already running.")
        return false;
    }
    Settings.ConsoleActive = true;


    // Banner
    PrintBanner ();

    PrintEmptyLine ();
    PrintLine ("!!! DEVELOPMENT VERSION !!!")    
    PrintEmptyLine ();
    
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

    if (Settings.Config.ANSIAllowed)
        prompt = ANSI_SAFE + prompt + ANSI_CLEAR;

    Sys.OUT_TXT_RAW (prompt);
}
//const Search   = require ('./cmd_search.js');




function PrintBanner ()
{
    let text = "*************************\n"
             + "* SILANAEL ARWEAVE TOOL *\n"
             + "*************************\n"
             + Util.GetVersionStr () + "\n\n"             

    if (Settings.Config.ANSIAllowed)
        text = ANSI_SAFE + text + ANSI_CLEAR;   
        
    Sys.OUT_TXT_RAW (text);
}




function SetMain (main)
{
    Main = main;
}



module.exports = { HandleCommand, SetMain };