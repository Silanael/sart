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
var ArweaveHost  = "arweave.net";
var ArweavePort  = 443;
var ArweaveProto = "https";
var Verbose      = false;
var Quiet        = false;







function Main (argv)
{

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
    VERBOSE ("Initializing Arweave: Connecting to " + GetHostString () + "...")

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


function SetVerbose ()      { Verbose      = true;         }
function SetQuiet   ()      { Quiet        = true;         }
function SetHost    (host)  { ArweaveHost  = host;         }
function SetPort    (port)  { ArweavePort  = port;         }
function SetProto   (proto) { ArweaveProto = proto;        }
function IsFlag     (arg)   { return arg.startsWith ('-'); }


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
    console.log (str);
}



// Informative output - needs to be enabled.
function VERBOSE (str)
{
    console.log (str);
}



// Error message output.
function ERR (str)
{
    console.error (str);
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




// Entrypoint
Main (process.argv);