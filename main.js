#!/usr/bin/env node 
// Silanael ARweave Tool
//
// main.js - 2021-10-16_01
//


// Imports
Arweave = require ("arweave");



function Main (argv)
{
    const argc = argv.length;

    // No arguments given.
    if (argc <= 2)
        DisplayHelp ();

    // Parse arguments.
    else
    {
        for (let C = 2; C < argc; ++C)
        {
            let arg = argv[C].toLowerCase ();
            switch (arg)
            {
                case "--help":
                case "-h":
                    DisplayHelp ();
                    break;

                default:
                    ERR (`Unknown argument ${arg}`);
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