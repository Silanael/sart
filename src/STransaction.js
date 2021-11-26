//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// STransaction.js - 2021-11-26
// SART transaction object
//

const Settings = require ('./settings.js');
const Util     = require ('./util.js');
const Sys      = require ('./sys.js');




class TXTag
{

    Name  = null;
    Value = null;

    constructor (name, value) { this.Name = name; this.Value = value; }
    /* Override */ toString () { return this.Name + ":" + this.Value  }


    AddAsFieldTo (dest_obj, name_prefix = "")
    { 
        if (dest_obj != null) 
            dest_obj[name_prefix + this.Name] = this.Value; 
    }
    
    HasValue (value, case_sensitive = true)
    {        
        return case_sensitive ? this.Value == value : this.Value?.toLowerCase () == value?.toLowerCase ();
    }

    static FromGQLEdgeTags (tags)
    {
        if (tags == null)
            return [];

        const ta = [tags.length];
        for (const t of tags)
        {
            ta.push (new TXTag (t.name, t.value) );
        }
    }

    static FromArweaveTXTags (tx)
    {
        return tags != null ? Util.DecodeTXTags (tx) : [];        
    }

    static GetTag (tags = [], tag, case_sensitive = true)
    {
        if (!tag)        
        {
            Sys.ERR ("PROGRAM ERROR: 'tag' null.", "TXTag.GetTag");
            return null;
        }
        else
            return tags?.find (e => Util.StrCmp (e, tag, !case_sensitive) );        
    }

    static GetTagValue (tags = [], tag, case_sensitive = true)
    {
        return TXTag.GetTag (tags, tag, case_sensitive)?.Value;
    }

    static HasTag (tags = [], tag, value = null, case_sensitive = true)
    {
        const tag = TXTag.GetTag (tags, tag, case_sensitive);
        return tag != null && (value == null || tag.HasValue (value, case_sensitive) )  
    }

}



class TXStatusInfo
{
    Status        = null;
    StatusCode    = null;
    Confirmations = null;
    MinedAtBlock  = null;

    IsMined     () { return this.StatusCode == Constants.TXSTATUS_OK       };
    IsPending   () { return this.StatusCode == Constants.TXSTATUS_PENDING  };
    IsFailed    () { return this.StatusCode == Constants.TXSTATUS_NOTFOUND };
    IsConfirmed () 
    { 
        if (State.Config.SafeConfirmationsMin == null || isNaN (State.Config.SafeConfirmationsMin) )
        {
            Sys.ERR_ONCE ("Config.SafeConfirmationsMin not properly set!");
            return false;
        }

        else 
            return this.IsMined () && this.Confirmations != null && this.Confirmations >= State.Config.SafeConfirmationsMin; 
    }
    
    toString () { return this.Status != null ? this.Status : this.StatusCode != null ? this.StatusCode : "UNKNOWN"; }

}



class STransaction
{
    Status    = new TXStatusInfo ();
    ArweaveTX = null;
    GQL_Edge  = null;

    Info =
    {
        TXID                : null,
        Owner               : null,
        Recipient           : null,
        BlockHeight         : null,
        BlockID             : null,
        BlockUTime          : null,        
        Quantity_AR         : null,
        Quantity_Winston    : null,
        DataSize_Bytes      : null,
        Fee_AR              : null,
        Fee_Winston         : null,
        Status              : this.Status,
        Tags                : null,
    }
    
    
    SetEdge (edge) 
    { 
        if (edge != null)
        {
            this.Info.TXID               = edge.node?.id,
            this.Info.Owner              = edge.node?.owner?.address,
            this.Info.BlockID            = edge.node?.block?.id         != null ? edge.node.block.id                  : null;
            this.Info.BlockHeight        = edge.node?.block?.height     != null ? Number (edge.node.block.height)     : null;
            this.Info.BlockUTime         = edge.node?.block?.timestamp  != null ? Number (edge.node.block.timestamp)  : null;
            this.Info.Tags               = TXTags.FromGQLEdgeTags (edge.node?.tags);
            
            this.Info.Fee_Winston        = edge.node?.fee?.winston      != null ? Number (edge.node.fee.winston)      : null;
            this.Info.Fee_AR             = edge.node?.fee?.ar           != null ? Number (edge.node.fee.ar)           : null;
            this.Info.Quantity_Winston   = edge.node?.quantity?.winston != null ? Number (edge.node.quantity.winston) : null;
            this.Info.Quantity_AR        = edge.node?.quantity?.ar      != null ? Number (edge.node.quantity.ar)      : null;
            this.Info.DataSize_Bytes     = edge.node?.data?.size        != null ? Number (edge.node.data.size)        : null;
        }
    }

    SetArweaveTXData (tx, owner)
    {        
        if (tx != null)
        {        
            if (Settings.IsForceful () || State.Config.MaxTXFormat == null || tx.format <= State.Config.MaxTXFormat)
            {
                this.Info.TXID             = tx.id;
                this.Info.Owner            = owner;
                this.Info.BlockHeight      = null;                
                this.Info.Timestamp        = null;
                this.Info.Fee_Winston      = Number (tx.reward);
                this.Info.Fee_AR           = null;
                this.Info.Quantity_Winston = Number (tx.quantity);
                this.Info.Quantity_AR      = null;
                this.Info.DataSize_Bytes   = Number (tx.data_size);
                this.Info.Tags             = TXTags.FromArweaveTXTags (tx);                
            }
            else
                Sys.ERR ("Unsupported transaction format/version '" + tx.format + "'. Use --force to process anyway.");

            return entry;
        }
        else
            return null;
    }


    GetTXID        ()         { return this.Info.TXID;                                                                  }
    GetOwner       ()         { return this.Info.Owner;                                                                 }
    GetBlockID     ()         { return this.Info.BlockID;                                                               }
    GetBlockHeight ()         { return this.Info.BlockHeight;                                                           }
    GetBlockTime   ()         { return this.Info.BlockUTime;                                                            }
    GetDate        ()         { return this.Info.BlockUTime       != null ? Util.GetDate (this.Info.BlockUTime) : null; }
    GetFee_AR      ()         { return this.Info.Fee_AR           != null ? this.Info.Fee_AR           : 0;             }
    GetQTY_AR      ()         { return this.Info.Quantity_AR      != null ? this.Info.Quantity_AR      : 0;             }
    GetFee_Winston ()         { return this.Info.Fee_Winston      != null ? this.Info.Fee_Winston      : 0;             }
    GetQTY_Winston ()         { return this.Info.Quantity_Winston != null ? this.Info.Quantity_Winston : 0;             }    
    GetDataSize_B  ()         { return this.Info.DataSize_Bytes   != null ? this.Info.DataSize_Bytes   : 0;             }
    GetRecipient   ()         { return this.Info.Recipient;                                                             }
    HasFee         ()         { return this.Info.Fee_AR           != null && this.Info.Fee_AR          > 0;             }
    HasTransfer    ()         { return this.Info.Quantity_AR      != null && this.Info.Quantity_AR     > 0;             }
    HasData        ()         { return this.Info.DataSize_Bytes   != null && this.Info.DataSize_Bytes  > 0;             }
    HasRecipient   ()         { return this.Info.Recipient != null;                                                     }    
    HasTag         (tag, val) { return TXTag.HasTag (this.Info.Tags, tag, val);                                         }    
    GetTag         (tag)      { return TXTag.GetTag (this.Info.Tags, tag);                                              }        
    GetTagValue    (tag)      { return TXTag.GetTag (this.Info.Tags, tag)?.Value;                                       }        
    GetTags        ()         { return this.Info.Tags; }        
    IsNewerThan    (tx)       { return this.GetBlockHeight () > tx?.GetBlockHeight ()                                   }        
    IsMined        ()         { return this.Status?.IsMined       ()                                                    }
    IsPending      ()         { return this.Status?.IsPending     ()                                                    }
    IsFailed       ()         { return this.Status?.IsFailed      ()                                                    }
    IsConfirmed    ()         { return this.Status?.IsConfirmed   ()                                                    }
    
    
    WithTag (name, value)
    {
        if (this.Info.Tags == null) 
            this.Info.Tags = [];

        this.Info.Tags.push (new TXTag (name, value) );
        
        return this; 
    }


}
   

class STransactions
{
    Sort = null;
    ByID = {};

    constructor (sort)
    { 
        this.Sort = sort; 
    }

    Add (stx, txid = null)
    {
        if (stx == null)
            Sys.ERR ("PROGRAM ERROR: 'stx' null!", "Transactions.Add");

        else
        {
            if (txid == null)
                txid = stx.GetTXID ();
            
            if (this.ByID[txid] != null)
                Sys.VERBOSE ("TXID " + txid + " already exists in the set - replacing.", "Transactioconst ns.Add");
            
            ById[txid] = stx;
        }
            
        return this;
    }

    /** Set value to null to get entries that contain the tag (with any value). */
    GetTransactionsByTag (tag, value = null)
    {
        const ret = new STransactions (this.Sort);
   
        for (const e of Object.entries (this.ByID) )
        {
            const txid = e[0];
            const obj  = e[1];

            if (obj.HasTag (tag, value) )
                ret.Add (obj, txid);            
        }
        return ret;
    }


     GetTransactionsByOwner (owner)
    {
        const ret = new STransactions (this.Sort);

        if (owner == null)
        {
            Sys.ERR ("PROGRAM ERROR: owner null", "Entry.GetEntriesByOwner");
            return ret;
        }
        
        for (const e of Object.entries (this.ByID) )
        {
            const txid = e[0];
            const obj  = e[1];

            if (obj.GetOwner () == owner)
                ret.Add (obj, txid);            
        }
       
        return ret;
    }


    GetOldestEntry ()
    {        
        const entries = Object.values (this.ByID); 
        const amount = entries != null ? entries.length : 0;
        const listfe = entries != null ? entries[0]     : null;

        
        if (amount <= 0)
            return null;

        else if (amount == 1)
            return listfe;

        else
        {

            let oldest = this.Sort == SORT_OLDEST_FIRST ? listfe
                                                        : sort == SORT_NEWEST_FIRST ? entries [entries.length - 1]
                                                                                         : null;

            Sys.DEBUG ("Initial set oldest to " + (oldest == null ? oldest.GetTXID () : null ) );

            const debug = Settings.IsDebug ();

            for (const e of entries)
            {
                if (oldest == null || e.GetBlockHeight () < oldest.GetBlockHeight () )
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID + " at block height " + e.GetBlockHeight () + " is older than " 
                                    + (oldest != null ? oldest.GetTXID () + " at " + oldest.GetBlockHeight () : null) );
                    oldest = e;                    
                }
            }
            
            if (oldest == null)
                Sys.ERR ("Could not determine oldest entry out of " + entries?.length + " transactions!", "STransactions");

            else
                Sys.VERBOSE ("Determined that " + oldest.GetTXID () + " at block height " + oldest.GetBlockHeight () + " is the oldest transaction.");

            return oldest;
        }
    }          


    GetNewestEntry (owner = null)
    {
        const entries = Object.values (this.ByID); 
        const amount = entries != null ? entries.length : 0;
        const listfe = entries != null ? entries[0]     : null;
        
        if (amount <= 0)
            return null;

        else if (amount == 1)
            return listfe;

        else
        {
            let newest = this.GetOldestEntry ();
            const debug = Settings.IsDebug ();

            for (const e of entries)
            {
                if (owner != null && e.GetOwner () != owner)
                {
                    Sys.WARN (`Found a transaction that doesn't match the owner ${owner}
TXID: ${e.GetTXID ()}  at address ${e.GetOwner ()}
${Sys.ANSIRED()}Possible hostile collision attempt from ${e.GetOwner ()}.${Sys.ANSICLEAR()}`);
                    Sys.DEBUG (e);
                }

                else if (newest == null || (e.GetBlockHeight () > newest.GetBlockHeight () ) )
                {
                    if (debug)
                        Sys.DEBUG (e.GetTXID + " at block height " + e.GetBlockHeight () + " is newer than " 
                                    + (newest != null ? newest.GetTXID () + " at " + newest.GetBlockHeight () : null) );
                    newest = e;                    
                }
            }
            
            if (newest == null)
                Sys.ERR ("Could not determine oldest entry out of " + entries?.length + " transactions!", "STransactions");

            else
                Sys.VERBOSE ("Determined that " + newest.GetTXID () + " at block height " + newest.GetBlockHeight () + " is the newest transaction.");

            return newest;
        }
    }

}




module.exports = { STransaction, STransactions, TXTag, TXStatusInfo };