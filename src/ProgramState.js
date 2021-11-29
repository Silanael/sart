//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ProgramState.js - 2021-11-25_01
// A singleton-class to hold the program state.
//

const Constants = require ("./CONST_SART.js");


class ProgramState
{    
    Config           = this.SetConfigToDefault ().conf;
    ConfigFilename   = null;

    CurrentHost      = null;
    ArweaveInstance  = null;
    ConnectionState  = Constants.CONNSTATES.NOTCONN;
    ConsoleActive    = false;


    GetConfig       () { return this.Config != null ? this.Config : this.SetConfigToDefault ().conf; }
    IsConsoleActive () { return this.ConsoleActive;                                                  }

    
    SetConfigToDefault ()
    {
        this.Config = {};
        
        for (const e of Object.entries (Constants.CONFIG_DEFAULT) )
        {
            const key        = e[0];
            const value      = e[1];
            this.Config[key] = value;
        }

        const error = Object.keys (this.Config)?.length < 20 ? "Failed to set default config!" : null;
        
        return { conf: this.Config, error: error }
    }
}



module.exports = new ProgramState ();