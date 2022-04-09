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
const CMD_Upload     = require ("./Commands/CMD_Upload");

const CMD_Console    = require ("./Commands/CMD_Console");
const CMD_Test       = Util.RequireOptional ("./Commands/CMD_Test");
const CMD_Sila       = Util.RequireOptional ("./Commands/CMD_Silanael");


const COMMANDS =  
{
    "help"        : new CMD_Help   ()         .WithAliases ("--help", "-h", "/h", "/?"),    
    "version"     : new CommandDef ("VERSION").WithFunc (null, function () { Sys.OUT_TXT (Util.GetVersionStr ()); }).WithAliases ("-v")
                                              .WithDescription ("Displays the program version."),    
    "info"        : new CMD_Info   (),
    "connect"     : null,
    "list"        : new CMD_List   ()         .WithAliases ("ls"),    
    "get"         : null,    
    "status"      : null, 
    "upload"      : new CMD_Upload (),   
    "verify"      : null,
    "pending"     : null,
    "console"     : new CMD_Console (),
    "exit"        : new CommandDef  ("EXIT").WithFunc (function (c) { Sys.GetMain ().ExitConsole (); } ).WithAliases ("quit", "q", "/quit", "/exit"),    
    "set"         : null,
    "readme"      : new CMD_ReadMe  (),
    "quiet"       : new MessageCMD  ("QUIET", "You be quiet."),
    "verbose"     : new SettingCMD  ("VERBOSE",        SETTINGS.LogLevel, Constants.LOGLEVELS.VERBOSE),
    "debug"       : new SettingCMD  ("DEBUG",          SETTINGS.LogLevel, Constants.LOGLEVELS.DEBUG),
    "loglevel-msg": new SettingCMD  ("LOGLEVEL-MSG",   SETTINGS.LogLevel, Constants.LOGLEVELS.MSG),    
    
    "date"        : new CommandDef ("DATE").WithFunc 
    (
        function (cmd)
        { 
            const unixtime = cmd.GetArgsAmount () >= 1 ? Number (cmd.Pop() ) : null;

            if (unixtime != null && isNaN (unixtime) )
                return Sys.ERR ("Not a number. Give an unix-time in seconds since 1970-01-01 00:00:00.");

            else
                Sys.INFO (Util.GetDate (unixtime) + " local, " + Util.GetDate (unixtime, null, true) + " UTC." ); return true; 
        }
    ),

    "size"        : new CommandDef ("SIZE").WithFunc
    (
        function (cmd)
        {         
            if (!cmd.RequireAmount (1, "Amount of bytes required.") )
                return false;

            const b = Number (cmd.Pop () );

            if (isNaN (b) )
                return Sys.ERR ("Not a number.");

            else
                Sys.INFO (Util.GetSizeStr (b, true, Sys.GetMain().GetSetting (SETTINGS.SizeDigits)) );

            return true;
        }, 
    )
    
        
};




if (CMD_Test != null)
    COMMANDS.test = new CMD_Test ();


if (CMD_Sila != null)
{
    for (const c of CMD_Sila)
        COMMANDS[c?.GetName ()] = c;
}









module.exports = COMMANDS;