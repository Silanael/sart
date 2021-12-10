// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// COMMANDS.js - 2021-12-09_01
//
// The command-handlers of SART
//

const Util           = require ("./Util");
const Sys            = require ("./System");
const CMD_Help       = require ("./Commands/CMD_Help");
const CMD_ReadMe     = require ("./Commands/CMD_ReadMe");
const CMD_Info       = require ("./Commands/CMD_Info");
const CommandDef     = require ("./CommandDef");





const COMMANDS =  
{
    "help"        : new CMD_Help ()         .WithAliases ("--help", "-h", "/h", "/?"),    
    "version"     : new CommandDef  ("VERSION").WithFunc (null, function () { Sys.OUT_TXT (Util.GetVersionStr ()); }).WithAliases ("-v")
                                            .WithDescription ("Displays the program version."),    
    "info"        : new CMD_Info ()         .WithAliases ("-i"),
    "-i"          : null,
    "connect"     : null,
    "list"        : null,
    "-l"          : null,
    "get"         : null,
    "-g"          : null,
    "status"      : null,
    "-s"          : null,
    "verify"      : null,
    "pending"     : null,
    "console"     : null,
    "exit"        : null,
    "quit"        : null,
    "set"         : null,
    "readme"      : new CMD_ReadMe (),
    "test"        : new CommandDef ("test").WithFunc (function () { return true}, function () { Sys.INFO ("Testing."); } ),
    /*
    "date"        : function ()
    { 
        const unixtime = args.GetAmount () >= 1 ? Number (args.Pop() ) : null;
        if (unixtime != null && isNaN (unixtime) )
            return Sys.ERR ("Not a number. Give an unix-time in seconds since 1970-01-01 00:00:00.");
        else
            Sys.INFO (Util.GetDate (unixtime) + " local, " + Util.GetDate (unixtime, null, true) + " UTC." ); return true; 
    },
    "size"        : function (args)
    {         
        if (!args.RequireAmount (1, "Amount of bytes required.") )
            return false;

        const b = Number (args.Pop () );

        if (isNaN (b) )
            return Sys.ERR ("Not a number.");
        else
            Sys.INFO (Util.GetSizeStr (b, true, State.Config.SizeDigits) );

        return true;
    }, 
    */   
        
};



module.exports = COMMANDS;