const Constants = require ("./CONST_SART");
const Util      = require ("./Util");
const TXQuery   = require ("./GQL_TXQuery");


/** Returns a GQL-edge. */
class ByTXQuery extends TXQuery
{
   
    async Execute (txid, owner = null)
    {       
        this.Sort = Constants.GQL_SORT_OLDEST_FIRST;

        if (!Util.IsSet (txid) )
        {
            Sys.ERR_PROGRAM ("TXID not provided.", "Transaction.ByTXQuery.Execute");
            return null;
        }

        await super.ExecuteOnce
        (
            TXQuery.CreateTxQuery 
            ({                     
                    first:  1,
                    id:     txid,
                    owner:  owner,                     
                    sort:   this.Sort,                                                            
            })
        );

        const amount = this.GetEdgesAmount ();

        if (amount == 1)        
            return this.GetEdge (0);

        else if (amount == 0)
            Sys.VERBOSE ("GQL: Could not find TX", txid);
        
        else        
            Sys.ERR ("Invalid amounts of entries returned for a TX-query: " + amount, txid);
            
        return null;        
    }
}


module.exports = ByTXQuery;