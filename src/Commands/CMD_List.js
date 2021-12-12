//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CMD_List.js - 2021-12-11_01
// Command 'list'
//

const CommandDef = require ("../CommandDef").CommandDef;


class CMD_List extends CommandDef
{
    Name          = "LIST";
    MinArgsAmount = 1;

    Subcommands =
    {
        "ADDRESS"     : new SubCMD_Address (),
        "ARFS"        : null,
        "DRIVE"       : null,
        "DRIVES"      : null,
        "ALL-DRIVES"  : null,
        "CONFIG"      : null,
    }
}


class SubCMD_Address extends CommandDef
{
    Name          = "ADDRESS";
    MinArgsAmount = 1;
}


module.exports = CMD_List;