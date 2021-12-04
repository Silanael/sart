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

    Cache            = null;
    CacheHits        = 0;
    CacheMisses      = 0;
    

    GetConfig       () { return this.Config != null ? this.Config : this.SetConfigToDefault ().conf; }
    IsConsoleActive () { return this.ConsoleActive;                                                  }
    IsCacheEnabled  () { return this.Cache != null;                                                  }
    GetCacheHits    () { return this.CacheHits   ;                                                   }
    GetCacheMisses  () { return this.CacheMisses ;                                                   }

    
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

    GetArFSEntity (args = { entity_type: null, arfs_id: null} )
    {
        if (this.Cache == null)
        {
            ++this.CacheMisses;
            return null;
        }
        else
            return this.Cache?.GetArFSEntity (args);
    }

    AddArFSEntity (args = { entity_type: null, arfs_id: null} )
    {
        if (this.Cache == null)
            return false;

        else
            return this.Cache.AddArFSEntity (args);
    }
}



module.exports = new ProgramState ();