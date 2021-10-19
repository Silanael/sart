//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// util.js - 2021-10-17_01
// Utility-functions
//

// Imports
const { ERR_FATAL } = require("./sys");




//function IsFlag (arg)               { return arg.startsWith ('-'); }
function IsFlag        (arg, flags)   { return flags[arg] != undefined; }
function IsArweaveHash (str)          { return str.length == 43 && /[a-zA-Z0-9\-]+/.test(str); }
function IsArFSID      (str)          { return str.length == 36 && /^........\-....\-....\-....\-............$/.test(str); }
function GetUNIXTime   ()             { return new Date ().getTime (); }

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


function RequireArgs (args, amount)
{
    const len = args.length;
    if (len < amount)
        ERR_FATAL ("Missing arguments: " + len + " / " + amount + " supplied.");
}




module.exports = { IsFlag, GetCmdArgs, RequireArgs, IsArweaveHash, IsArFSID, GetDate, GetUNIXTime };