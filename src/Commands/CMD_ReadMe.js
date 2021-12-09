//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CMD_ReadMe.js - 2021-12-08_01
// Command 'README'
//

const CommandHandler = require ("../CommandHandler");
const Util           = require ("../Util");
const Sys            = require ("../System");
const FS             = require ("fs");


class CMD_ReadMe extends CommandHandler
{
    constructor () 
    { 
        super ("README"); 
        this.WithAliases["RTFM"]; 
        this.WithDescription ("Displays the content of the README.md -file.")
    }

    OnExecute (args)
    {
        return true;        
    }

    OnOutput (args)
    {
        try
        {
            Sys.INFO (FS.readFileSync (__dirname + "/../../README.md", "utf-8" ));
        }
        catch (exception)
        {
            Sys.ON_EXCEPTION (exception, "DisplayReadme");
            Sys.ERR ("Couldn't open README.md. How lame is that.");
        }        
    }
}


module.exports = CMD_ReadMe;