//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// STransaction.js - 2021-11-26
// SART transaction object
//

const Constants    = require ("./CONST_SART.js");
const State        = require ("./ProgramState.js");
const Settings     = require ('./Settings.js');
const Util         = require ('./Util.js');
const Sys          = require ('./System.js');
const Arweave      = require ("./Arweave.js");
const TXTag        = require ("./TXTag.js");
const TXTagGroup   = require ("./TXTagGroup");
const TXStatus     = require ("./TXStatus.js");
const SARTObject   = require ("./SARTObject.js");




class Transaction extends SARTObject
{
    Type                = "Transaction";

    State               = new TXStatus ();
    ArweaveTX           = null;
    GQL_Edge            = null;
      
    TXID                = null;
    Owner               = null;
    Recipient           = null;
    Quantity_AR         = null;
    Quantity_Winston    = null;
    DataSize_Bytes      = null;
    DataRoot            = null;
    DataLocation        = null;
    Fee_AR              = null;
    Fee_Winston         = null;
    BlockHeight         = null;
    BlockID             = null;
    BlockUTime          = null;
    TXAnchor            = null;
    Tags                = null;
    Errors              = null;
    
    InfoFields = 
    [
        "Type",
        "TXID",             
        "Owner",            
        "Recipient",        
        "Quantity_AR",      
        "Quantity_Winston", 
        "DataSize_Bytes",   
        "DataRoot",         
        "DataLocation",     
        "Fee_AR",           
        "Fee_Winston",      
        "BlockHeight",      
        "BlockID",         
        "BlockUTime",
        "TXAnchor",     
        "Tags",
        "TagsTotalSizeB",
        "State",
        "Warnings",
        "Errors",        
    ];      
      
    // Use the by name -object under normal circumstances, do a listing if there are multiple tags with the same name.
    CustomFieldFuncs = 
    { 
        "Tags":           function (t) { return t?.Tags?.HasDuplicates () ? t.Tags.GetList () : t?.Tags?.GetNameValueObj () },
        "Recipient":      function (t) { return t?.HasRecipient        () ? t.GetRecipient () : "NONE" },
        "TagsTotalSizeB": function (t) { return t?.Tags?.GetTotalBytes (); }  
    };
    
    RecursiveFields = ["Tags", "State", "Warnings", "Errors"]




    constructor (txid = null)
    {
        super ();
        this.SetTXID (txid);
    }
    
  


    SetTXID (txid)
    {
        if (txid == null)
            return;

        const current_txid = this.GetTXID ();

        if (current_txid != null && txid != current_txid)
            this.OnError ("TXID mismatch on setting from QGL-edge: Was " + current_txid + ", tried to set as " + txid, "Transaction");
            
        else
            this.TXID = txid;

        return this.TXID;
    }

    SetOwner (owner)
    {
        if (owner == null)
            return;

        const current_owner = this.GetOwner ();

        if (current_owner != null && owner != current_owner)
        {
            const error = "Owner mismatch on setting from QGL-edge: Was " + current_owner + ", tried to set as " + owner;
            Sys.ERR_PROGRAM (error, "Transaction");
            this.OnError ("PROGRAM ERROR: " + error);            
        }
        else
            this.Owner = owner;

        return this.Owner;
    }

  

    SetGQLEdge (edge) 
    { 
        this.GQL_Edge = edge;

        if (edge != null)
        {            
            this.SetTXID  (edge.node?.id);
            this.SetOwner (edge.node?.owner?.address)
            
            this.__SetInfo ("BlockID"            , edge.node?.block?.id         != null ? edge.node.block.id                  : null);
            this.__SetInfo ("BlockHeight"        , edge.node?.block?.height     != null ? Number (edge.node.block.height)     : null);
            this.__SetInfo ("BlockUTime"         , edge.node?.block?.timestamp  != null ? Number (edge.node.block.timestamp)  : null);        
            this.__SetInfo ("Tags"               , TXTagGroup.FROM_QGL_EDGE (edge)                                                  );
            
            this.__SetInfo ("Fee_Winston"        , edge.node?.fee?.winston      != null ? Number (edge.node.fee.winston)      : null);
            this.__SetInfo ("Fee_AR"             , edge.node?.fee?.ar           != null ? Number (edge.node.fee.ar)           : null);
            this.__SetInfo ("Quantity_Winston"   , edge.node?.quantity?.winston != null ? Number (edge.node.quantity.winston) : null);
            this.__SetInfo ("Quantity_AR"        , edge.node?.quantity?.ar      != null ? Number (edge.node.quantity.ar)      : null);
            this.__SetInfo ("DataSize_Bytes"     , edge.node?.data?.size        != null ? Number (edge.node.data.size)        : null);

            this.Validate ();
        }

        return this;
    }


    async SetArweaveTXData (arweave_tx)
    {        
        this.ArweaveTX = arweave_tx;

        const config = State.GetConfig ();

        if (config.MaxTXFormat == null || arweave_tx.format <= config.MaxTXFormat || Settings.IsForceful () )
        {            
            this.SetTXID      (arweave_tx.id);
            this.SetOwner     (await Arweave.OwnerToAddress (arweave_tx.owner) );   
            
            this.__SetInfo ("Recipient"        , Arweave.GetRecipient (arweave_tx)                   );
            this.__SetInfo ("Fee_Winston"      , Number (arweave_tx.reward)                          );
            this.__SetInfo ("Fee_AR"           , Number (Arweave.WinstonToAR (arweave_tx.reward))    );
            this.__SetInfo ("Quantity_Winston" , Number (arweave_tx.quantity)                        );
            this.__SetInfo ("Quantity_AR"      , Number (Arweave.WinstonToAR (arweave_tx.quantity))  );
            this.__SetInfo ("DataSize_Bytes"   , Number (arweave_tx.data_size)                       );
            this.__SetInfo ("DataRoot"         , arweave_tx.data_root                                );            
            this.__SetInfo ("TXAnchor"         , arweave_tx.last_tx                                  );            
            this.__SetInfo ("Tags"             , TXTagGroup.FROM_ARWEAVETX (arweave_tx)              );    
            

            this.__SetInfo ("DataLocation"     , arweave_tx.data?.length > 0 ? Util.IsSet (arweave_tx.data_root) ? "TX + DataRoot" : "TX" 
                                                 : Util.IsSet (arweave_tx.data_root) ? "DataRoot" : "NO DATA" );
                                                 
            this.Validate ();
        }
        else
            this.OnError ("Unsupported transaction format/version '" + arweave_tx.format + "'. Use --force to process anyway.", "Transaction.SetArweaveTXData",
                        { error_id: Constants.ERROR_IDS.TXFORMAT_UNSUPPORTED } );
    
        return this;
    }


    Validate ()
    {
        if ( (this.Quantity_Winston > 0 || this.Quantity_AR > 0) && !this.HasRecipient () )
            this.OnError ("Quantity set to " + this.Quantity_Winston + " (W) but recipient missing.");        
    }


    __SetInfo (key, value)
    {
        if (key == null)                   
            return this.OnProgramError ("Failed to set info, key provided was null.", "Transaction.__SetInfo");
            
        if (value == null)
            return false;

        const existing = this[key];

        if (!existing)
        {
            this[key] = value;
            return true;
        }

        else if (existing != value)
            return this.OnError ("Info key '" + key + "' already set to '" + existing + "' which is different than new value '" + value 
                                  + "' !", "Transaction.__SetInfo");
                    

    }

    async FetchFromArweave (txid = null)
    {
        if (txid != null)
            this.SetTXID (txid);

        else if ( (txid = this.GetTXID ()) == null)
            return Sys.OnProgramError ("TXID not supplied.", "Transaction.FetchFromArweave");

        const arweave_tx = await Arweave.GetTx (txid);
        
        if (arweave_tx != null)
        {
            await this.SetArweaveTXData (arweave_tx)
            return true;
        }

        else
            return this.OnError ("Failed to fetch " + txid + " from Arweave-network!", "Transaction.FetchFromArweave");
            
        
    }


    GetTXID                  ()         { return this.TXID;                                                                       }
    GetOwner                 ()         { return this.Owner;                                                                      }
    GetBlockID               ()         { return this.BlockID;                                                                    }
    GetBlockHeight           ()         { return this.BlockHeight;                                                                }
    GetBlockTime             ()         { return this.BlockUTime;                                                                 }
    GetDate                  ()         { return this.BlockUTime       != null ? Util.GetDate (this.BlockUTime) : null;           }
    GetFee_AR                ()         { return this.Fee_AR           != null ? this.Fee_AR           : 0;                       }
    GetQTY_AR                ()         { return this.Quantity_AR      != null ? this.Quantity_AR      : 0;                       }
    GetFee_Winston           ()         { return this.Fee_Winston      != null ? this.Fee_Winston      : 0;                       }
    GetQTY_Winston           ()         { return this.Quantity_Winston != null ? this.Quantity_Winston : 0;                       }    
    GetDataSize_B            ()         { return this.DataSize_Bytes   != null ? this.DataSize_Bytes   : 0;                       }    
    HasFee                   ()         { return this.Fee_AR           != null && this.Fee_AR          > 0;                       }
    HasTransfer              ()         { return this.Quantity_AR      != null && this.Quantity_AR     > 0;                       }
    HasData                  ()         { return this.DataSize_Bytes   != null && this.DataSize_Bytes  > 0;                       }
    HasRecipient             ()         { return this.Recipient != null && this.Recipient != "";                                  }
    GetRecipient             ()         { return this.HasRecipient   () ? this.Recipient : null;                                  }
    HasTag                   (tag, val) { return this.Tags?.HasTag   (tag, val);                                                  }    
    GetTag                   (tag)      { return this.Tags?.GetTag   (tag);                                                       }        
    GetTagValue              (tag)      { return this.Tags?.GetValue (tag);                                                       }        
    GetTags                  ()         { return this.Tags;                                                                       }        
    IsNewerThan              (tx)       { return this.GetBlockHeight        () > tx?.GetBlockHeight ()                            }        
    IsOlderThan              (tx)       { return this.GetBlockHeight        () < tx?.GetBlockHeight ()                            }        
    IsMined                  ()         { return this.Status?.IsMined       ()                                                    }
    IsPending                ()         { return this.Status?.IsPending     ()                                                    }
    IsFailed                 ()         { return this.Status?.IsFailed      ()                                                    }
    IsConfirmed              ()         { return this.Status?.IsConfirmed   ()                                                    }
    GetStatus                ()         { return this.State;                                                                      }
    async UpdateAndGetStatus ()         { await  this.State.UpdateFromTXID (this.GetTXID () ); return this.State;                 }


    WithTag (name, value)
    {
        if (this.Tags == null) 
            this.Tags = new TXTagGroup ();

        this.Tags.Add (new TXTag (name, value) );
        
        return this; 
    }


}
   

module.exports = Transaction;