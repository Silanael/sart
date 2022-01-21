const Sys         = require ('../System.js');
const Constants   = require ("../CONSTANTS.js");
const State       = require ("../ProgramState");
const Config      = require ("../Config");
const { SETTINGS} = require ("../SETTINGS");
const Arweave     = require ("./Arweave.js");
const ByTXQuery   = require ("../GQL/ByTXQuery");



class TXStatus 
{
    TXID          = null;
    Status        = null;
    StatusCode    = null;
    Confirmations = null;
    MinedAtBlock  = null;


    IsFetched        () { return this.Status != null; }
    GetStatus        (str_if_not_present = null) { return this.Status != null ? this.Status : str_if_not_present; };
    GetStatusCode    () { return this.StatusCode    };
    GetConfirmations () { return this.Confirmations };

    GetStatusDescription    (str_if_not_present = null)
    { 

        if (this.IsFetched () )
        {
            if (this.IsConfirmed () )
                return "Successfully mined with " + this.Confirmations + " confirmations.";

            else if (this.IsMined () )
                return "Mined, but amount of confirmations (" + this.Confirmations + ") still low.";

            else if (this.IsPending () )
                return "The transaction is still waiting to be mined.";

            else if (this.IsFailed () )
                return "Unable to retrieve transaction status - it may have failed."
        }
        else
            return str_if_not_present != null ? str_if_not_present : "Status not fetched.";

    }

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
            Sys.DEBUG ("Arweave.GetTXStatus returned 404"); //, trying with a GQL-query..", txid);
            
            // TODO
            /*
            const query = new ByTXQuery (Arweave);
            const res = await query.Execute (txid);

            if (res != null)
            {
                const tx = Transaction.FROM
                if (res.IsMined () )
                    txstatus = { status: Constants.TXSTATUS_OK, confirmed: {} };
                else 
                    txstatus = { status: Constants.TXSTATUS_PENDING, confirmed: null };
            }
            else
                txstatus = { status: Constants.TXSTATUS_NOTFOUND, confirmed: null };
            */
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

        else 
        {
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
        const key = SETTINGS.SafeConfirmationsMin;
        const safe_confirm_min = Config.GetSetting (key);

        if (safe_confirm_min == null || isNaN (safe_confirm_min) ) 
        {
            Sys.ERR_ONCE ("Setting '" + key.GetKey () + "' not properly set!");
            return false;
        }

        else
            return this.IsMined () && this.Confirmations != null && this.Confirmations >= safe_confirm_min;
    }

    //toString() { return this.Status != null ? this.Status : this.StatusCode != null ? this.StatusCode : "UNKNOWN"; }

}


module.exports = TXStatus;
