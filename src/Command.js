// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// Command.js - 2021-12-07_01
//
// Base class for a command
//

const Sys = require ("./System");


class Command
{
    Name        = null;    
    SubCommands = {};
    HelpLines   = [];
    
    WithHelpLines   (helplines)   { this.HelpLines   = helplines;   return this; }
    WithSubCommands (subcommands) { this.SubCommands = subcommands; return this; }

    GetName () { return this.Name; }

    DisplayHelp ()
    {
        if (this.HelpLines.length <= 0)
            Sys.ERR ("No help available for command '" + this.GetName () + "'.");

        else for (const l of this.HelpLines)
        {
            Sys.INFO (l);         
        }

        Sys.INFO ("Valid subcommands: " + Util.KeysToStr (this.SubCommands) );
    }

    HandleCommand (args) {}

}



module.exports = Command;