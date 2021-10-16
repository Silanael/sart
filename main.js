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
const Arweave = require ('arweave');
const Package = require ("./package.json");



// Constants
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;




// Arg-Command mapping table
const Commands =
{    
    "help"        : DisplayHelp,
    "/?"          : DisplayHelp,         // For the Windows-scrubs.
    "/h"          : DisplayHelp,         //
    "version"     : DisplayVersion,    
    "info"        : DisplayArweaveInfo
}



// Arg-Command mapping table
const Flags =
{
    "-V"          : { "F": SetVerbose, "A":false },
    "--verbose"   : { "F": SetVerbose, "A":false },
    "-q"          : { "F": SetQuiet,   "A":false },
    "--quiet"     : { "F": SetQuiet,   "A":false },
    "--help"      : { "F": DisplayHelp,"A":false },
    "-h"          : { "F": SetHost,    "A":true  },
    "--host"      : { "F": SetHost,    "A":true  },
    "--port"      : { "F": SetPort,    "A":true  },
    "--proto"     : { "F": SetProto,   "A":true  },
}



// Variables
var ManualDest   = false;
var ArweaveHost  = "arweave.net";
var ArweavePort  = 443;
var ArweaveProto = "https";
var Verbose      = false;
var Quiet        = false;







function Main (argv)
{

    process.on ("uncaughtException", ErrorHandler);    
    const argc = argv.length;


    // No arguments given.
    if (argc <= FIRST_ARG)
        DisplayHelp ();


    
    else
    {    
        // Parse flags first
        ParseFlags (argc, argv);


        // Seek for the command
        for (let C = FIRST_ARG; C < argc; ++C)
        {
            let arg_raw = argv[C];
                
            
            // Ignore flags and flag parameters
            if (IsFlag (arg_raw) || (C > FIRST_ARG && IsFlag (argv[C-1])) )
                continue;
                        
            let cmd = Commands[arg_raw.toLowerCase ()];
            
            if (cmd != undefined)            
                cmd ();
           
            else
                ERR_FATAL (`Unknown command: "${arg}".`);                    

            // Process only one command.
            break;
        }
    }
}



function ParseFlags (argc, argv)
{

    for (let C = FIRST_ARG; C < argc; ++C)
    {    
        let arg_raw  = argv[C];    

        // Only process flags.
        if (IsFlag (arg_raw) )
        {
            let arg = arg_raw.startsWith ("--") ? arg_raw.toLowerCase () 
                                                : arg_raw;

            const entry = Flags[arg];
                
            if (entry != undefined)           
            {
                // Takes a parameter
                if (entry.A)
                {
                    entry.F (FetchFlagArg (argc, argv, C, arg_raw) );
                    ++C; // Skip over the flag-arg
                }
                else
                    entry.F ();
            }

            else
                ERR_FATAL ("Unknown argument: " + arg_raw);

        }
    }    
}

function FetchFlagArg (argc, argv, pos, flag)
{
    ++pos;
    if (pos >= argc)
        ERR_FATAL ("Missing argument for " + flag + "!");
    else 
        return argv[pos];
}




function InitArweave ()
{
    INFO ("Connecting to " + GetHostString () + "...")

    try
    {
        let arweave = Arweave.init
        (
            {
                host:     ArweaveHost,
                port:     ArweavePort,
                protocol: ArweaveProto
            }
        );
        return arweave;
    }
    catch (err)
    {
        ERR_FATAL ("foo");
    }
}



function GetHostString ()
{
    return ArweaveProto + "://" + ArweaveHost + ":" + ArweavePort;
}


function SetVerbose ()      { Verbose      = true;  if (Quiet)   ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); }
function SetQuiet   ()      { Quiet        = true;  if (Verbose) ERR_CONFLICT ("Can't be both verbose and quiet at the same time"); }
function SetHost    (host)  { ArweaveHost  = host;  ManualDest = true;                                                              }
function SetPort    (port)  { ArweavePort  = port;  ManualDest = true;                                                              }
function SetProto   (proto) { ArweaveProto = proto; ManualDest = true;                                                              }
function IsFlag     (arg)   { return arg.startsWith ('-');                                                                          }


function DisplayHelp ()
{
    OUT ("Usage: foo");
    EXIT (0);
}



function DisplayVersion (argv)
{    
    OUT (Package.version);
}



async function DisplayArweaveInfo ()
{
    const arweave = await InitArweave ();

    VERBOSE ("Fetching network information..");
    OUT (await arweave.network.getInfo () );
}



// Data output. Non-silencable.
function OUT (str)
{
    console.log (str);
}



// Informative output - will be silenceable.
function INFO (str)
{
    if (!Quiet)
        console.log (str);
}



// Informative output - needs to be enabled.
function VERBOSE (str)
{
    if (Verbose && !Quiet)
        console.log (str);
}



// Error message output.
function ERR (str)
{
    if (!Quiet)
        console.error (str);
}



function ERR_CONFLICT (msg)
{
    console.error (msg + ". Stop fucking around.");
    EXIT (-1);
}



// Error message output + exit.
function ERR_FATAL (str)
{
    ERR (str);
    EXIT (-1);
}



function EXIT (code)
{
    process.exit (code);
}



function ErrorHandler (error)
{    
    if (error != undefined)
    {
        VERBOSE (error);

        let msg = error.code;
        switch (error.code)
        {
            case "ENOTFOUND": msg = "Host not found!"; break;
        }
        ERR_FATAL ("ERROR: " + msg);
    }

    else
        ERR_FATAL ("It appears that an error of an unknown nature has occurred.. How curious..");

}



// Entrypoint
Main (process.argv);