//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// util.js - 2021-10-17_01
// Utility-functions
//

const { ERR_FATAL } = require("./sys");


//function IsFlag (arg)        { return arg.startsWith ('-'); }
function IsFlag (arg, flags)   { return flags[arg] != undefined; }



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




module.exports = { IsFlag, GetCmdArgs, RequireArgs };