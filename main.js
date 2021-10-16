#!/usr/bin/env node 
// Silanael ARweave Tool
//
// main.js - 2021-10-16_01
//


// Imports
const Arweave = require ("arweave");
const Package = require ("./package.json");



// Constants
const FILENAME_PATH_ARG = 1;
const FIRST_ARG         = 2;





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


                default:
                    ERR (`Unknown argument: "${arg}".`);
                    OUT ("Use --help to get usage information.");
                    break;
            }
        }
    }
}



function DisplayHelp ()
{
    OUT ("Usage: foo");
}



function DisplayVersion (argv)
{    
    OUT (Package.version);
}



// A wrapper for the future.
function OUT (str)
{
    console.log (str);
}



// A wrapper for the future, for errors.
function ERR (str)
{
    console.error (str);
}



// Entrypoint
Main (process.argv);