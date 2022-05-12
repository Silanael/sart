//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CMD_ReadMe.js - 2021-12-08_01
// Command 'README'
//

const FS             = require ("fs");
const Util           = require ("../Util");
const Sys            = require ("../System");
const CommandDef     = require ("../CommandDef").CommandDef;



class CMD_ReadMe extends CommandDef
{
    constructor () 
    { 
        super ("README"); 
        this.WithAliases["RTFM"]; 
        this.WithDescription ("Displays the content of the README.md -file.")
    }

    OnExecute (args, cmd)
    {
        return true;        
    }

    OnOutput (args, cmd)
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