//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// util.js - 2021-10-17_01
// Utility-functions
//

// Imports
const Sys      = require ("./sys");
const Package  = require ("./package.json");




//function IsFlag (arg)               { return arg.startsWith ('-'); }
function IsFlag        (arg, flags)   { return flags[arg] != undefined; }
function IsArweaveHash (str)          { return str.length == 43 && /[a-zA-Z0-9\-]+/.test(str); }
function IsArFSID      (str)          { return str.length == 36 && /^........\-....\-....\-....\-............$/.test(str); }
function GetUNIXTime   ()             { return new Date ().getTime (); }
function GetVersion    ()             { return Package.version; }


function GetDate ()
{ 
    const now = new Date (); 
    return        now.getFullYear () + "-" + now.getMonth   () + "-" + now.getDate    () 
          + "_" + now.getHours    () + ":" + now.getMinutes () + ":" + now.getSeconds ();
}


function GetCmdArgs (argv, cmd_pos, flags)
{
    const len    = argv.length;
    let   params = 0;
    
    for (let C = cmd_pos + 1; C < len; ++C)
    {
        if (IsFlag (argv[C], flags) )
            break;
        else
            params++;
    }    

    return argv.slice (++cmd_pos, cmd_pos + params);    
}


function RequireArgs (args, amount, src)
{
    const srcstr = src != null ? src + ": " : "";
        
    const len = args.length;
    if (len < amount)
        Sys.ERR_FATAL (srcstr + "Missing arguments: " + len + " / " + amount + " supplied.");
}

function RequireParam (param, name, src)
{
    const srcstr = src != null ? src + ": " : "";

    if (param == undefined)
        Sys.ERR_FATAL (srcstr + "Missing parameter: " + name);

}


module.exports = { IsFlag, GetCmdArgs, RequireArgs, RequireParam, IsArweaveHash, IsArFSID, GetDate, GetUNIXTime, GetVersion };