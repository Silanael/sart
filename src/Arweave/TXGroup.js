const Constants   = require ("../CONSTANTS.js");
const Sys         = require ('../System.js');
const SARTGroup   = require ("../SARTGroup");
const Transaction = require ("./Transaction.js");



class TXGroup extends SARTGroup
{

    SortOrder = null;
    SortDone  = false;
    
    InfoFields       = ["Transactions", "TransactionInfo"];
    RecursiveFields  = this.InfoFields;
    CustomFieldFuncs = 
    {
        "Transactions"         : function (e) { return e?.AsArray      ();             },
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


    GetByTXID  (txid)  { return this.GetByID (txid);  }
    HasTXID    (txid)  { return this.HasID   (txid);  }
    toString   ()      { return "TXGroup";            }   
    GetSort    ()      { return this.SortOrder;       } 
    


    SetSortOrder (sort) 
    { 
        if (sort == null)
            this.OnProgramError ("Tried to set null sort order!", this);

        else if (sort != this.SortOrder)
        {
            this.SortOrder = sort;
            this.SortDone  = false;
        }
        return this; 
    }


    Sort (sort)
    {
        this.SetSortOrder (sort);

        if (!this.SortDone)
        {
            if (sort == Constants.GQL_SORT_OLDEST_FIRST)
            {
                this.Entries.sort ( (a, b) => a.GetBlockHeight () - b.GetBlockHeight () );
                this.SortDone = true;
            }

            else if (sort == Constants.GQL_SORT_NEWEST_FIRST)
            {
                this.Entries.sort ( (a, b) => b.GetBlockHeight () - a.GetBlockHeight () );
                this.SortDone = true;
            }

            else
                this.OnError ("Invalid sort mode '" + sort + this, "TXGroup.Sort");        
        }
        else
            Sys.DEBUG ("Sort already marked as done, not re-sorting.", this);
    }


    async FetchStatusOfAll ()
    {
        const report =
        {
            Total:     0,
            Confirmed: 0,
            Mined:     0,
            Pending:   0,
            Missing:   0,

            Transactions: {}
        }

        for (const tx of this.AsArray () )
        {
            const txid = tx.GetTXID ();

            if (report.Transactions[txid] != null)
                this.OnError ("Duplicate TXID encountered: " + txid);

            else
            {
                const status = await tx.UpdateAndGetStatus ();

                if (status == null)
                    this.OnProgramError ("Failed to get status object for tx " + tx);

                else
                {                
                    report.Total++;                
                    if      (status.IsConfirmed () ) report.Confirmed++ ; 
                    else if (status.Mined       () ) report.Mined++     ; 
                    else if (status.Pending     () ) report.Pending++   ; 
                    else if (status.Failed      () ) report.Missing++   ; 

                    report.Transactions[txid] = tx.GetTypeShort () + " - " + status.GetStatusFull ();
                }
            }
        }

        return report;
    }


    GenerateInfo ()
    {
        const Info = {};

        for (const t of this.AsArray () )
        {
            Info[t.GetDate] = t.toString ();
        }
    }





    /* Get a group of transactions with the condition of IsValid () == true. */
    GetValidTransactions ()
    {
        const group = new TXGroup (this.GetSort () );
        const list  = this.AsArray ();

        if (list != null && list.length > 0)
        {
            for (const tx of list)
            {
                if (tx.IsValid () )
                    group.Add (tx);
                else
                    Sys.WARN ("Pruned invalid transaction " + tx);
            }
        }
        return group;            
    }


    /** Set value to null to get entries that contain the tag (with any value). */
    GetTransactionsMatching (criteria = { owner: null, tag: null, tagvalue: null } ) 
    {
        const ret = new TXGroup (this.SortOrder);

        for (const t of this.AsArray () )
        {            
            if ( (criteria.owner == null || t.Getowner () == criteria.owner ) &&
                 (criteria.tag   == null || t.HasTag   (tag, value)         ) )
                ret.Add (t);
        }
        return ret;
    }



    /** Set value to null to get entries that contain the tag (with any value). */
    GetTransactionsByTag (tag, value = null)
    {
        const ret = new TXGroup (this.GetSort () );

        for (const e of this.AsArray () ) 
        {            
            if (e.HasTag (tag, value) )
                ret.Add (e);
        }

        const sel_amount  = ret.GetAmount  ();
        const this_amount = this.GetAmount ();

        Sys.VERBOSE ("Selected " + sel_amount + " / " + this_amount + " transactions by tag " + tag + ":" + value
                     + " (" + (this_amount - sel_amount) + " omitted)");
        return ret;
    }

    
    GetTransactionsByOwner (owner) 
    {
        const ret = new TXGroup (this.GetSort () );

        if (owner == null) 
        {
            Sys.ERR_PROGRAM ("owner null", "Entry.GetEntriesByOwner");
            return ret;
        }

        for (const e of this.AsArray () )
        {            
            if (e.GetOwner () == owner)
                ret.Add (e);
        }

        
        const sel_amount  = ret.GetAmount  ();
        const this_amount = this.GetAmount ();

        Sys.VERBOSE ("Selected " + sel_amount + " / " + this_amount + " transactions by owner '" + owner + "'"
                          + " (" + (this_amount - sel_amount) + " omitted)");
        
        return ret;
    }


    GetOldestEntry () 
    {
        const entries    = this.AsArray ();
        const amount     = entries != null ? entries.length : 0;
        const listfe     = entries != null ? entries[0]     : null;
        const sort_order = this.GetSort ();

        if (amount <= 0)
            return null;

        else if (amount == 1)
            return listfe;


        else 
        {
            let oldest = sort_order == Constants.GQL_SORT_OLDEST_FIRST ? listfe
                                                                       : sort_order == Constants.GQL_SORT_NEWEST_FIRST ? entries[entries.length - 1]
                                                                                                                       : null;

            Sys.DEBUG ("Initial set oldest to " + (oldest != null ? oldest.GetTXID () : null) );

        
            for (const e of entries) 
            {
                if (oldest == null || e.IsOlderThan (oldest) ) 
                {                    
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