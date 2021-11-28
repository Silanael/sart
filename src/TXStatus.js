const Sys     = require('./sys.js');
const Arweave = require('./arweave.js');


class TXStatus 
{
    Status = null;
    StatusCode = null;
    Confirmations = null;
    MinedAtBlock = null;


    async UpdateFromTXID (txid) 
    {
        this.SetToArweaveTXStatus (await Arweave.GetTXStatus (txid) );
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

    toString() { return this.Status != null ? this.Status : this.StatusCode != null ? this.StatusCode : "UNKNOWN"; }

}


module.exports = TXStatus;
