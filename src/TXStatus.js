const Sys       = require('./System.js');
const Arweave   = require('./Arweave.js');
const Constants = require ("./CONSTANTS.js");
const State     = require ("./ProgramState");


class TXStatus 
{
    TXID          = null;
    Status        = null;
    StatusCode    = null;
    Confirmations = null;
    MinedAtBlock  = null;


    IsFetched        () { return this.Status != null; }
    GetStatus        () { return this.Status != null ? this.Status : "UNKNOWN"; };
    GetStatusFull    () { return this.Status == null ? "STATUS NOT QUERIED"
                                                     : this.Status + (this.IsConfirmed () ? 
                                                     " (" + this.Confirmations + " con., block " + this.MinedAtBlock + ")" : ""); };
    GetStatusCode    () { return this.StatusCode    };
    GetConfirmations () { return this.Confirmations };


    async UpdateFromTXID (txid) 
    {
        if (this.TXID != null && txid != this.TXID)
            Sys.WARN ("TXID mismatch - was " + this.TXID + ", updating to " + txid, "TXStatus.UpdateFromTXID");
        
        this.TXID = txid;
        let txstatus = await Arweave.GetTXStatus (txid);
        
        // Currently (2021-11-18), the gateway doesn't return TX-status for transactions
        // that are contained inside bundles, yet a GQL-query is able to fetch them.
        if (txstatus != null && txstatus.status == Constants.TXSTATUS_NOTFOUND)
        {
            Sys.DEBUG ("Arweave.GetTXStatus returned 404, trying with a GQL-query..", txid);
            
            const query = new GQL.ByTXQuery (this);
            const res = await query.Execute (txid);

            if (res != null)
            {
                if (res.IsMined () )
                    txstatus = { status: Constants.TXSTATUS_OK, confirmed: {} };
                else 
                    txstatus = { status: Constants.TXSTATUS_PENDING, confirmed: null };
            }
            else
                txstatus = { status: Constants.TXSTATUS_NOTFOUND, confirmed: null };
        }

        this.SetToArweaveTXStatus (txstatus);                
    }


    SetToArweaveTXStatus (txstatus) 
    {
        if (txstatus != null) 
        {
            this.StatusCode    = txstatus.status;
            this.Confirmations = txstatus.confirmed?.number_of_confirmations;
            this.MinedAtBlock  = txstatus.confirmed?.block_height;
            this.Status        = Arweave.GetTXStatusStr (this.StatusCode, this.Confirmations);
        }

        else {
            this.Status        = null;
            this.StatusCode    = null;
            this.Confirmations = null;
            this.MinedAtBlock  = null;
            Sys.ERR_PROGRAM ("'txstatus' null", "TxStatusInfo.SetToArweaveTXStatus");
        }
    }



    IsMined     () { return this.StatusCode == Constants.TXSTATUS_OK;       };
    IsPending   () { return this.StatusCode == Constants.TXSTATUS_PENDING;  };
    IsFailed    () { return this.StatusCode == Constants.TXSTATUS_NOTFOUND; };
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

    //toString() { return this.Status != null ? this.Status : this.StatusCode != null ? this.StatusCode : "UNKNOWN"; }

}


module.exports = TXStatus;
