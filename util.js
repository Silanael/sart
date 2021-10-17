//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// util.js - 2021-10-17_01
// Utility-functions
//


function IsFlag (arg)   { return arg.startsWith ('-'); }


function GetCmdArgs (argv, cmd_pos)
{
    const len    = argv.length;
    let   params = 0;

    
    for (let C = cmd_pos + 1; C < len; ++C)
    {
        if (IsFlag (argv[C]))            
            break;
        else
            params++;
    }    

    return argv.slice (++cmd_pos, cmd_pos + params);    
}



// Converts an Uint8Array to a string that can be sent to stdout.
function DataToStr (data)
{
    return new TextDecoder("utf-8").decode (data);
}



module.exports = { IsFlag, GetCmdArgs, DataToStr };