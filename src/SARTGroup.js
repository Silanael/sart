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

    Entries        = [];
    ByID           = {};
    ByName         = {};
    NameValuePairs = {};


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
    ContainsID      (id)         { return this.GetByID (id) != null;                                              }
    GetByIndex      (index)      { return index >= 0 && index < this.Entries.length ? this.Entries[index] : null; }    
    AsArray         ()           { return this.Entries;                                                           }
    AddAllFromGroup (group)      { return this.AddAll (group.AsArray () ); }
    toString        ()           { return "SARTGroup" + (this.Name != null ? " '" + this.Name + "'" : "");        }


    GetByName (name, case_sensitive = false)
    {         
        return Util.GetKeyFromJSObj (this.ByName, name, case_sensitive);        
    }

    GetValue (name, case_sensitive = false)
    { 
        return Util.GetKeyFromJSObj (this.NameValuePairs, name, case_sensitive);        
    }

    
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

    Contains (entry)
    {
        if (entry != null)
        {
            const id   = entry.GetID   ();
            const name = entry.GetName ();

            return this.Entries.includes (entry) || (id != null && this.ByID[id] != null) || (Util.IsSet (name) && this.ByName[name] != null);
        }
        else
        {
            Sys.ERR_PROGRAM (this.toString + ".Contains () was given a null parameter.");
            return false;
        }
    }
    
    Add (entry, {id = null, allow_duplicates = false} = {} ) 
    {
        
        if (entry == null)
            Sys.ERR_PROGRAM ("'entry' null.", "Transactions.Add");

        if (id == null && entry.GetID != null)
            id = entry.GetID ();


        if (!allow_duplicates && this.Contains (entry) )
            Sys.ERR_PROGRAM ("'" + entry.toString () + "' already contained in group '" + this.toString () + "' or duplicate name and/or ID present.");

        else 
        {
            Sys.DEBUG ("Adding entry " + entry, this.toString () )
            
            const name = entry.GetName ();
            
            if (id != null)          { this.ByID  [id]   = entry; }
            if (Util.IsSet (name) )  { this.ByName[name] = entry; }
            if ('Value' in entry)    { this.NameValuePairs[name] = entry.Value; }

            if (entry.Aliases?.length > 0)
            {
                for (const a of entry.Aliases)
                {                    
                    if (this.ByName[a] == null)
                        this.ByName[a] = entry;
                    else
                        Sys.ERR ("Group '" + this + "' already contains a name clashing with alias '" + a + "' of '" + entry + "'.");
                }
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

    Print ()
    {
        const array = this.AsArray ();
        
        Sys.OUT_TXT ("Group '" + this.GetName () + "' with " + array.length + " entries:");

        let index = 1;
        for (const e of this.AsArray () )
        {
            Sys.OUT_TXT (index + "#: " + e.toString () );
            ++index;
        }
    }
}




module.exports = SARTGroup;