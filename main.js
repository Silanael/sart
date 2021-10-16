#!/usr/bin/env node 
// Silanael ARweave Tool
//
// main.js - 2021-10-16_01
//


// Imports
const Arweave = require ('arweave');
const Package = require ("./package.json");



// Constants
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;



// Variables
var ArweaveHost  = "arweave.net";
var ArweavePort  = 443;
var ArweaveProto = "https";



function Main (argv)
{
    const argc = argv.length;

    // No arguments given.
    if (argc <= FIRST_ARG)
        DisplayHelp ();


    // Parse arguments.
    else
    {    
        for (let C = FIRST_ARG; C < argc; ++C)
        {
            let arg = argv[C].toLowerCase ();
            switch (arg)
            {                
                case "-h":
                case "--help":
                    DisplayHelp ();
                    break;

                case "-v":
                case "--version":
                    DisplayVersion (argv);
                    break;

                case "-i":
                case "--info":
                    DisplayArweaveInfo ();
                    break;

                default:
                    ERR (`Unknown argument: "${arg}".`);
                    INFO ("Use --help to get usage information.");
                    break;
            }
        }
    }
}



async function InitArweave ()
{
    VERBOSE ("Initializing Arweave: Connecting to " + GetHostString () + "...")
    return Arweave.init
    (
        {
            host:     ArweaveHost,
            port:     ArweavePort,
            protocol: ArweaveProto
        }
    );
}



function GetHostString ()
{
    return ArweaveProto + "://" + ArweaveHost + ":" + ArweavePort;
}



function DisplayHelp ()
{
    OUT ("Usage: foo");
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



// Entrypoint
Main (process.argv);