//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ProgramState.js - 2021-11-25_01
// A singleton-class to hold the program state.
//

const Constants = require ("./CONSTANTS.js");


class ProgramState
{    
    Main                    = null;

    GlobalConfig            = null;
    ConfigFilename          = null;
       
    CurrentHost             = null;
    ArweaveInstance         = null;
    ConnectionState         = Constants.CONNSTATES.NOTCONN;
    ConsoleActive           = false;
       
    Cache                   = null;
    CacheHits               = 0;
    CacheMisses             = 0;
    
    PreviousCommandInst     = null;
    ActiveCommandInst       = null;
    ActiveConcurrentFetches = [];


    GetGlobalConfig   ()   { return this.GlobalConfig;           }
    IsConsoleActive   ()   { return this.ConsoleActive;          }
    IsCacheEnabled    ()   { return this.Cache != null;          }
    GetCacheHits      ()   { return this.CacheHits   ;           }
    GetCacheMisses    ()   { return this.CacheMisses ;           }
    GetHost           ()   { return this.CurrentHost;            }
    GetActiveCommand  ()   { return this.ActiveTask;             }
    GetSettingValue   (key) { return this.Main?.GetSettingValue (key)  }
    

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