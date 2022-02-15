// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// SARTGroup.js - 2021-12-07_01
//
// A generic object container.
//

const CONSTANTS    = require ("./CONSTANTS");
const Sys          = require ("./System");
const Util         = require ("./Util");
const SARTBase     = require ("./SARTBase");
const OutputParams = require ("./OutputParams");


class SARTGroup extends SARTBase
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

    With            (...objects) { this.AddAll (...objects);                                         return this; }
    WithObj         (obj)        { this.Add (obj);                                                   return this; }

    GetAmount       ()           { return this.Entries.length;                                                    }        
    GetByID         (id)         { return this.ByID[id];                                                          }
    GetByName       (name)       { return this.ByName[name];                                                      }
    ContainsID      (id)         { return this.GetByID (id) != null;                                              }
    GetByIndex      (index)      { return index >= 0 && index < this.Entries.length ? this.Entries[index] : null; }
    AsArray         ()           { return this.Entries;                                                           }
    AddAllFromGroup (group)      { return this.AddAll (group.AsArray () ); }
    toString        ()           { return "SARTGroup" + (this.Name != null ? " '" + this.Name + "'" : "");        }


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
        
        if (entry == null)
            Sys.ERR_PROGRAM ("'entry' null.", "Transactions.Add");

        else 
        {
            Sys.DEBUG ("Adding entry " + entry, this)
            
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

            if (Util.IsSet (name))
            {
                if (this.ByName[name] == null)
                    this.ByName[name] = entry;
                else
                    Sys.WARN ("Name collision - '" + name + "' already present in the group: " + this.ByName[name]?.toString () + " - not overwriting.");
            }
            
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


    Output (opts = new OutputParams () )
    {
        Sys.GetMain ()?.OutputObjects (this, opts);
    }


    GetFieldMaxLen (field)
    {
        let maxlen = 0;
        let fdata, namelen, valuelen;

        for (const o of this.AsArray () )
        {
            fdata     = o.GetFieldData (field);            
            namelen   = fdata?.GetFieldName  ()?.length;
            valuelen  = fdata?.GetFieldValue ()?.toString ().length;
            
            if (namelen  > maxlen)  maxlen = namelen;
            if (valuelen > maxlen) maxlen = valuelen;
        }

        return maxlen;
    }

    GetNameMaxLen ()
    {
        let maxlen = 0;
        let namelen;        

        for (const o of this.AsArray () )
        {                        
            namelen = o?.GetName()?.length;                        
            if (namelen > maxlen)  maxlen = namelen;            
        }

        return maxlen;
    }

    GetNamesAsArray ()
    {
        const names = [];
        for (const k of Object.keys (this.ByName) )
        {
            names.push (k);
        }
        return names;
    }

    GetNamesAsStr (opts = CONSTANTS.UTIL_ARRAYTOSTR_DEFAULTS) { return Util.ArrayToStr (this.GetNamesAsArray (), opts); }    
}




module.exports = SARTGroup;