// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTGroup.js - 2021-12-07_01
//
// A generic object container.
//

const Sys        = require ("./System");
const SARTObject = require ("./SARTObject");


class SARTGroup extends SARTObject
{


    Entries = [];
    ByID    = {};

    constructor (...entries)
    {
        super ();
        for (const e of entries)
        {            
            this.Add (e);
        }
    }

    GetAmount    ()         { return this.Entries.length;                                                    }        
    GetByID      (id)       { return this.ByID[id];                                                          }
    HasID        (id)       { return this.GetByID (id) != null;                                              }
    GetByIndex   (index)    { return index >= 0 && index < this.Entries.length ? this.Entries[index] : null; }
    AsArray      ()         { return this.Entries;                                                           }


    Clear ()
    {
        this.Entries = [];
        this.ByID    = {};
    }

    
    Add (entry, id = null) 
    {
        if (entry == null)
            Sys.ERR_PROGRAM ("", "Transactions.Add");

        else 
        {
            if (id == null && entry.GetID != null)
                id = entry.GetID ();

            if (id != null) 
            {
                if (this.ByID[id] != null)
                {
                    Sys.VERBOSE ("ID " + id + " already exists in group " + this.GetName + ", not adding it.", entry);
                    return this;
                }
                this.ByID[id] = entry;
            }

            this.Entries.push (entry);
        }

        return this;
    }

    AddAll (group)
    {
        if (group == null)
            return false;

        for (const t of group.AsArray () )
        {
            this.Add (t);
        }
        return true;
    }
    
}

module.exports = SARTGroup;