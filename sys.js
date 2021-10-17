#!/usr/bin/env node 
//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// sys.js - 2021-10-16_01
// Mostly output-related things.
//

// Local imports
const Settings = require ('./settings.js');



// Data output. Non-silencable.
function OUT (str)
{
    console.log (str);
}



// Informative output - will be silenceable.
function INFO (str)
{
    if (!Settings.Config.Quiet)
        console.log (str);
}



// Informative output - needs to be enabled.
function VERBOSE (str)
{        
    if (Settings.Config.Verbose && !Settings.Config.Quiet)
        console.log (str);
}



// Error message output.
function ERR (str)
{
    if (!Settings.Config.Verbose)
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
        
        // The Error is a string or so.
        if (msg == undefined)
        {
            ERR ("A possible bug in the code - recommend contacting me (sila@silanael.com).");
            msg = error;
        }

        // The error is a Javascript-array-thingy.
        else
        {
            switch (error.code)
            {
                case "ENOTFOUND": msg = "Host not found."; break;
            }
        }

        ERR_FATAL ("ERROR: " + msg);
    }

    else
        ERR_FATAL ("It appears that an error of an unknown nature has occurred.. How curious..");

}



module.exports = 
{
    OUT,
    INFO,
    VERBOSE,
    ERR,
    ERR_CONFLICT,
    ERR_FATAL,
    EXIT,
    ErrorHandler,
};