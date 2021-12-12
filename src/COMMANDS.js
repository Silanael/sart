// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// COMMANDS.js - 2021-12-09_01
//
// The command-handlers of SART.
//

const Util           = require ("./Util");
const Sys            = require ("./System");
const Constants      = require ("./CONSTANTS");
const { SETTINGS }   = require ("./SETTINGS");
const {CommandDef, 
       SettingCMD, 
       MessageCMD}   = require ("./CommandDef");

const CMD_Info       = require ("./Commands/CMD_Info");
const CMD_List       = require ("./Commands/CMD_List");
const CMD_Help       = require ("./Commands/CMD_Help");
const CMD_ReadMe     = require ("./Commands/CMD_ReadMe");

const CMD_Console    = require ("./Commands/CMD_Console");




const COMMANDS =  
{
    "help"        : new CMD_Help   ()         .WithAliases ("--help", "-h", "/h", "/?"),    
    "version"     : new CommandDef ("VERSION").WithFunc (null, function () { Sys.OUT_TXT (Util.GetVersionStr ()); }).WithAliases ("-v")
                                              .WithDescription ("Displays the program version."),    
    "info"        : new CMD_Info   ()         .WithAliases ("-i"),    
    "connect"     : null,
    "list"        : new CMD_List   ()         .WithAliases ("ls", "-l"),    
    "get"         : null,
    "-g"          : null,
    "status"      : null,
    "-s"          : null,
    "verify"      : null,
    "pending"     : null,
    "console"     : new CMD_Console (),
    "exit"        : new CommandDef  ("EXIT").WithFunc (function (c) {c.GetMain ().ExitConsole (); } ).WithAliases ("quit", "q", "/quit", "/exit"),    
    "set"         : null,
    "readme"      : new CMD_ReadMe  (),
    "quiet"       : new MessageCMD  ("quiet", "You be quiet."),
    "verbose"     : new SettingCMD  ("VERBOSE",        SETTINGS.LogLevel, Constants.LOGLEVELS.VERBOSE),
    "debug"       : new SettingCMD  ("DEBUG",          SETTINGS.LogLevel, Constants.LOGLEVELS.DEBUG),
    "loglevel-msg": new SettingCMD  ("LOGLEVEL-MSG",   SETTINGS.LogLevel, Constants.LOGLEVELS.MSG),
    "test"        : new CommandDef  ("test").WithFunc (function (c) { return true}, function () { Sys.INFO ("Testing."); } ),
    
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