// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTGroup.js - 2021-12-07_01
//
// A generic object container.
//

const Sys        = require ("./System");
const Util       = require ("./Util");
const SARTObject = require ("./SARTObject");



class SARTGroup extends SARTObject
{

    Entries = [];
    ByID    = {};
    ByName  = {};


    constructor (...entries)
    {
        super ();
        for (const e of entries)
        {            
            this.Add (e);
        }
    }

    GetAmount       ()       { return this.Entries.length;                                                    }        
    GetByID         (id)     { return this.ByID[id];                                                          }
    GetByName       (name)   { return this.ByName[name];                                                      }
    ContainsID      (id)     { return this.GetByID (id) != null;                                              }
    GetByIndex      (index)  { return index >= 0 && index < this.Entries.length ? this.Entries[index] : null; }
    AsArray         ()       { return this.Entries;                                                           }
    AddAllFromGroup (group)  { return this.AddAll (group.AsArray () ); }
    toString        ()       { return "SARTGroup" + (this.Name != null ? " '" + this.Name + "'" : "");        }


    GetByNameRegex (regex, case_sensitive = true)
    {         
        for (const e of this.AsArray () )
        {
            if (e.NameMatchesRegex != null && e.NameMatchesRegex (regex, case_sensitive) )
                return e;

            else if (e.GetName != null && Util.StrCmp_Regex (regex, e.GetName (), case_sensitive) )
                return e;
        }                                          
        return null;
    }

    Clear ()
    {
        this.Entries = [];
        this.ByID    = {};
    }

    
    Add (entry, id = null) 
    {
        Sys.DEBUG ("Adding entry " + entry, this)

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
                    Sys.VERBOSE ("ID " + id + " already exists in group " + this.GetName () + ", not adding it.", entry);
                    return this;
                }
                this.ByID[id] = entry;
            }

            const name = entry.GetName ();

            if (this.ByName[name] == null)
                this.ByName[name] = name;
            else
                Sys.WARN ("Name collision - '" + name + "' already present in the group: " + this.ByName[name]?.toString () + " - not overwriting.");

            this.Entries.push (entry);
        }

        return this;
    }


    AddAll (...items)
    {
        if (items == null || items.length <= 0)
            return false;

        for (const t of items)
        {
            this.Add (t);            
        }
        return true;
    }


    Output (opts = {UseListMode: true, WantedFields: null } )
    {
        Sys.OUT_OBJ (this.AsArray (), opts);
    }

}




module.exports = SARTGroup;