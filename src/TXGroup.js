const Constants   = require ("./CONST_SART.js");
const Settings    = require ('./Settings.js');
const Sys         = require ('./System.js');
const Transaction = require ("./Transaction.js");
const SARTObject  = require ("./SARTObject");


class TXGroup extends SARTObject
{

    SortOrder = null;
    List   = [];
    ByTXID = {};


    InfoFields       = ["Transactions", "TransactionInfo"];
    RecursiveFields  = this.InfoFields;
    CustomFieldFuncs = 
    {
        "Transactions"         : function (e) { return e?.AsArray ();                  },
        "TransactionInfo"      : function (e) { return e?.GenerateInfo ();             },        
    };


    constructor (sort) 
    {
        super ();
        this.SortOrder = sort;
    }

    
    static async FROM_GQLQUERY (query)
    {
        if (query != null)
        {
            const edges = query.GetEdges ();

            if (edges != null)
            {
                const transactions = new TXGroup (query.GetSort () );            
                for (const e of edges)
                {
                    transactions.Add (await Transaction.FROM_GQL_EDGE (e) );
                }
                return transactions;
            }            
        }
        return null;
    }


    GetAmount              ()           { const k = Object.keys (this.ByTXID); return k != null ? k.length : 0;                               }
    GetByTXID              (txid)       { return this.ByTXID[txid];                                                                           }
    GetByIndex             (index)      { const e = Object.entries (this.ByTXID); return index >= 0 && index < e.length ? e[index][1] : null; }
    AsArray                ()           { return this.List;                                                                                   }
    SetSortOrder           (sort)       { this.SortOrder = sort; return this; }


    Sort (sort)
    {
        this.SetSortOrder (sort);

        if (sort == Constants.GQL_SORT_OLDEST_FIRST)
            this.List.sort ( (a, b) => a.GetBlockHeight () - b.GetBlockHeight () );

        else if (sort == Constants.GQL_SORT_NEWEST_FIRST)
            this.List.sort ( (a, b) => b.GetBlockHeight () - a.GetBlockHeight () );

        else
            this.OnError ("Invalid sort mode '" + sort + "'", "TXGroup.Sort");        
    }


    GenerateInfo ()
    {
        const Info = {};
        for (const t of this.AsArray () )
        {
            Info[t.GetDate] = t.toString ();
        }
    }


    Add (stx, txid = null) 
    {
        if (stx == null)
            Sys.ERR_PROGRAM("'stx' null!", "Transactions.Add");


        else 
        {
            if (txid == null)
                txid = stx.GetTXID ();

            if (this.ByTXID[txid] != null) 
            {
                Sys.VERBOSE ("TXID " + txid + " already exists in the set, not replacing it", "STransactions.Add");
                return this;
            }

            this.ByTXID[txid] = stx;
            this.List.push (stx);
        }

        return this;
    }
    

    AddAll (txgroup)
    {
        if (txgroup == null)
            return false;

        for (const t of txgroup.AsArray () )
        {
            this.Add (t);
        }
        return true;
    }



    /** Set value to null to get entries that contain the tag (with any value). */
    GetTransactionsMatching (criteria = { owner: null, tag: null, tagvalue: null } ) 
    {
        const ret = new TXGroup (this.SortOrder);

        for (const e of Object.entries (this.ByTXID) )
        {
            const txid = e[0];
            const obj  = e[1];

            if ( (criteria.owner == null || obj.Getowner () == criteria.owner ) &&
                 (criteria.tag   == null || obj.HasTag   (tag, value)         ) )
                ret.Add (obj, txid);
        }
        return ret;
    }



    /** Set value to null to get entries that contain the tag (with any value). */
    GetTransactionsByTag (tag, value = null)
    {
        const ret = new TXGroup (this.SortOrder);

        for (const e of Object.entries (this.ByTXID) ) 
        {
            const txid = e[0];
            const obj  = e[1];

            if (obj.HasTag (tag, value) )
                ret.Add (obj, txid);
        }

        if (Settings.IsVerbose () )
        {
            const sel_amount  = ret.GetAmount  ();
            const this_amount = this.GetAmount ();
            Sys.VERBOSE ("Selected " + sel_amount + " / " + this_amount + " transactions by tag " + tag + ":" + value
                         + " (" + (this_amount - sel_amount) + " omitted)");
        }

        return ret;
    }


    GetTransactionsByOwner (owner) 
    {
        const ret = new TXGroup (this.SortOrder);

        if (owner == null) 
        {
            Sys.ERR_PROGRAM ("owner null", "Entry.GetEntriesByOwner");
            return ret;
        }

        for (const e of Object.entries (this.ByTXID) )
        {
            const txid = e[0];
            const obj  = e[1];

            if (obj.GetOwner () == owner)
                ret.Add (obj, txid);
        }

        if (Settings.IsVerbose () )
        {
            const sel_amount  = ret.GetAmount  ();
            const this_amount = this.GetAmount ();
            Sys.VERBOSE ("Selected " + sel_amount + " / " + this_amount + " transactions by owner '" + owner + "'"
                          + " (" + (this_amount - sel_amount) + " omitted)");
        }

        return ret;
    }


    GetOldestEntry () 
    {
        const entries = this.AsArray ();
        const amount = entries != null ? entries.length : 0;
        const listfe = entries != null ? entries[0]     : null;


        if (amount <= 0)
            return null;

        else if (amount == 1)
            return listfe;


        else 
        {
            let oldest = this.SortOrder == Constants.GQL_SORT_OLDEST_FIRST ? listfe
                                                                      : this.SortOrder == Constants.GQL_SORT_NEWEST_FIRST ? entries[entries.length - 1]
                                                                                                                     : null;

            Sys.DEBUG ("Initial set oldest to " + (oldest != null ? oldest.GetTXID () : null) );

            const debug = Settings.IsDebug ();

            for (const e of entries) 
            {
                if (oldest == null || e.IsOlderThan (oldest) ) 
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID () + " at block height " + e.GetBlockHeight () + " is older than "
                                   + (oldest != null ? oldest.GetTXID () + " at " + oldest.GetBlockHeight () : null));
                    oldest = e;
                }
            }

            if (oldest == null)
                Sys.ERR ("Could not determine oldest entry out of " + entries?.length + " transactions!", "Transactions");


            else
                Sys.VERBOSE ("Determined that " + oldest.GetTXID () + " at block height " + oldest.GetBlockHeight () + " is the oldest transaction.");

            return oldest;
        }
    }


    GetNewestEntry (criteria = { owner: null } )
    {
        const entries = this.AsArray ();
        const amount = entries != null ? entries.length : 0;
        const listfe = entries != null ? entries[0]     : null;

        if (amount <= 0)
            return null;

        else if (amount == 1)
            return listfe;


        else
        {
            let newest = null;
            const debug = Settings.IsDebug ();

            for (const e of entries) 
            {
                if (criteria.owner != null && e.GetOwner () != criteria.owner) 
                {
                    Sys.WARN ("Found a transaction that doesn't match the owner '" + criteria.owner + "' "
                              + "TXID: " + e.GetTXID () + " at address " + e.GetOwner () + " - "
                              + Sys.ANSIRED ("Possible hostile collision attempt from " + e.GetOwner () ) );
                    Sys.DEBUG (e);
                }

                else if (newest == null || e.IsNewerThan (newest) )
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID () + " at block height " + e.GetBlockHeight () + " is newer than "
                            + (newest != null ? newest.GetTXID () + " at " + newest.GetBlockHeight () : null) );
                    newest = e;
                }
            }

            if (newest == null)
                Sys.ERR("Could not determine oldest entry out of " + entries?.length + " transactions!", "STransactions");


            else
                Sys.VERBOSE ("Determined that " + newest.GetTXID () + " at block height " + newest.GetBlockHeight () + " is the newest transaction.");

            return newest;
        }
    }


}


module.exports = TXGroup;