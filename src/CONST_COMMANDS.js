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
const Constants      = require ("./CONSTANTS");
const { SETTINGS }   = require ("./CONST_SETTINGS");
const CommandDef     = require ("./CommandDef");
const CMD_Help       = require ("./Commands/CMD_Help");
const CMD_ReadMe     = require ("./Commands/CMD_ReadMe");
const CMD_Info       = require ("./Commands/CMD_Info");
const CMD_Console    = require ("./Commands/CMD_Console");


class MessageCmd extends CommandDef { constructor (name, msg) { super (name); this.Message = msg;} OnOutput (c) { Sys.INFO (this.Message); } }

class SettingCmd extends CommandDef
{
    Key    = null;
    Value  = null;

    constructor (name, key, value)
    {
        super (name);
        this.Key   = key;
        this.Value = value;
        this.MinArgsAmount = value != null ? 0 : 1;
    }
    
    OnExecute (cmd_instance)
    {
        const value = this.Value != null ? this.Value : cmd_instance.Pop ();

        if ( cmd_instance.GetMain ()?.SetGlobalSetting (this.Key, value) )
            Sys.INFO ("Global setting '" + this.Key + "' set to '" + value + "'.");

        else            
            cmd_instance.OnError ("Failed to set global setting '" + this.Key + " to '" + value + "'.");
    }
}


const COMMANDS =  
{
    "help"        : new CMD_Help ()         .WithAliases ("--help", "-h", "/h", "/?"),    
    "version"     : new CommandDef  ("VERSION").WithFunc (null, function () { Sys.OUT_TXT (Util.GetVersionStr ()); }).WithAliases ("-v")
                                            .WithDescription ("Displays the program version."),    
    "info"        : new CMD_Info ()         .WithAliases ("-i"),    
    "connect"     : null,
    "list"        : null,
    "-l"          : null,
    "get"         : null,
    "-g"          : null,
    "status"      : null,
    "-s"          : null,
    "verify"      : null,
    "pending"     : null,
    "console"     : new CMD_Console (),
    "exit"        : new CommandDef ("EXIT").WithFunc (function (c) {c.GetMain ().ExitConsole (); } ).WithAliases ("quit", "q", "/quit", "/exit"),    
    "set"         : null,
    "readme"      : new CMD_ReadMe (),
    "quiet"       : new MessageCmd ("quiet", "You be quiet."),
    "verbose"     : new SettingCmd ("VERBOSE",        SETTINGS.LogLevel, Constants.LOGLEVELS.VERBOSE),
    "debug"       : new SettingCmd ("DEBUG",          SETTINGS.LogLevel, Constants.LOGLEVELS.DEBUG),
    "loglevel-msg": new SettingCmd ("LOGLEVEL-MSG",   SETTINGS.LogLevel, Constants.LOGLEVELS.MSG),
    "test"        : new CommandDef ("test").WithFunc (function (c) { return true}, function () { Sys.INFO ("Testing."); } ),
    
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