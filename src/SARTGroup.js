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


    constructor ( {name = null, entries = [] } = {} )
    {
        super ( {name: name} );
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
    
    Add (entry, {allow_duplicates = false} = {} ) 
    {
        
        if (entry == null)
            return Sys.ERR_PROGRAM ("'entry' null.", "Transactions.Add");
        

        if (!allow_duplicates && this.Contains (entry) )
            return Sys.ERR_PROGRAM ("'" + entry.toString () + "' already contained in group '" + this.toString () + "' or duplicate name and/or ID present.");

        else 
        {
            Sys.DEBUG ("Adding entry " + entry, this.toString () )
            
            const name = entry.GetName ();
            const id   = entry.GetID   ();
            
            if (id != null)          { this.ByID  [id]   = entry; }
            if (Util.IsSet (name) )  { this.ByName[name] = entry; this.NameValuePairs[name] = entry.Value; }            

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
            return true;
        }

        return false;        
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


    GetEffectiveItems (names = [], {groups = new SARTGroup (), use_all_if_no_names = true} = {} )
    { 

        const all_entries_arr = this.AsArray ();
        const all_names_arr   = this.GetNamesAsArray ();
        const names_initial   = names;

        if (names?.length <= 0)
            names = use_all_if_no_names ? all_names_arr : null;

        // A special case where only positives and/or negatives are given.
        else if (use_all_if_no_names && names.find (e => !e.startsWith ("-") && !e.startsWith ("+") ) == null)        
            names = all_names_arr?.concat (names);
        

        if (names == null && use_all_if_no_names)
        {            
            Sys.DEBUG ("GetEffectiveItems: 'names' null, including all items.");
            names = all_names_arr;            
        }

        if (names == null)
        {
            this.OnError ("GetEffectiveItems: No names given", this);
            return null;
        }


        if (groups?.GetAmount () > 0)
        {
            // Process groups    
            const groups_included = [];
            for (const iname of names)
            {            
                const group = groups.GetByName (iname);

                if (group != null)
                {                
                    const group_content = groups.GetNamesAsArray ();

                    if (group_content == null)
                        Sys.DEBUG ("No valid items in group '" + group + "'.");

                    else
                    {
                        Sys.DEBUG ("Adding names from group " + group + "...");
                        groups_included.push (...group_content);                    
                    }                
                }        
                else            
                    groups_included.push (iname);         
            }     
            names = groups_included;
        }

        // Get negates
        const negates = [];
        const no_negates = [];
        for (const iname of names)
        {
            if (iname != null)
            {
                if (iname.startsWith ("-") )            
                    negates.push (iname.slice (1) );            

                else
                    no_negates.push (iname.startsWith ("+") ? iname.slice (1) : iname);                
            }
        }


        // Process names
        const final_group = new SARTGroup ();

        for (const iname of no_negates)
        {
            const item = this.GetByName (iname);

            if (item == null)
                this.OnError ("Item '" + iname + "' does not exist.");

            else
            {
                let negated = false;
                for (const neg of negates)
                {
                    const nitem = this.GetByName (neg);

                    if (nitem == null)
                        this.OnError ("Negated item '" + neg + "' does not exist.");

                    else if (item == nitem)           
                    {
                        negated = true;
                        break;
                    }

                }
                if (!negated)
                {
                    Sys.DEBUG ("Adding item '" + item +  "' to the final group.");
                    final_group.Add (item);
                }
                else
                    Sys.DEBUG ("Item '" + item + "' negated - not adding to the final group.");
            }
        }     

        if (Sys.IsDebug () )
            Sys.DEBUG ("GetEffectiveItems: The initial name list '" + names_initial + "' resulted in the following items: " + final_group.GetNamesAsStr () );

        return final_group;    
    }  



    Print (debug = false)
    {
        const array = this.AsArray ();
        
        Sys.OUT_TXT ("Group '" + this.GetName () + "' with " + array.length + " entries:");

        let index = 1;
        for (const e of this.AsArray () )
        {
            Sys.OUT_TXT (index + "#: " + e.toString () );
            ++index;
        }

        if (debug)
        {
            Sys.DEBUG ("--- BY ID ---");
            Sys.DEBUG (this.ByID      );

            Sys.DEBUG ("--- BY NAME ---");
            Sys.DEBUG (this.ByName      );

            Sys.DEBUG ("--- NAME-VALUE -PAIRS ---");
            Sys.DEBUG (this.NameValuePairs        );         
        }
    }
}




module.exports = SARTGroup;