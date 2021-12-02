//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFSTX.js - 2021-12-01_01
//
// History of an ArFS-entity
//

const Sys = require ("./System");


class ArFSEntityHistory
{
    static CREATE (arfs_entity)
    {
        let previous = null;

        if (arfs_entity == null)
            return Sys.ERR_PROGRAM ("'arfs_entity' null.", "ArFSEntityHistory.CREATE");

        else if (arfs_entity.TX_Meta == null || arfs_entity.TX_Meta.GetAmount () <= 0 )
            return [];
            
        else for (const e of arfs_entity.TX_Meta.AsArray () )
        {
            const txid = e.GetTXID ();
            const date = e.GetDate ();

            e.FetchMetaOBJ ();
            
            const datestr = (date != null ? date : Util.GetDummyDate () );

            msg = datestr + " - ";
          
            // First metadata
            if (previous == null)
                msg += "Created" + (str_changes != null ? " with " + str_changes + "." : ".");
                                                        
            // Subsequent metadata (renames, moves etc.)
            else            
                msg += "Modified" + (str_changes != null ? ": " + str_changes + "." : ".");                                            
                        
            
            history[txid] = msg;
            previous      = e;
        }
    }
}



module.exports = ArFSEntityHistory;