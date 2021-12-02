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
const ByTXQuery    = require ("./GQL/GQL_ByTXQuery");




class Transaction extends SARTObject
{
    Type                = "Transaction";
    Network             = "Arweave";

    State               = new TXStatus ();
    ArweaveTX           = null;
    GQL_Edge            = null;
      
    TXID                = null;
    Owner               = null;
    Target              = null;
    Quantity_AR         = null;
    Quantity_Winston    = null;
    DataSize_Bytes      = null;
    DataRoot            = null;
    DataLocation        = null;
    Fee_AR              = null;
    Fee_Winston         = null;
    BlockHeight         = null;
    BlockID             = null;
    BlockUNIXTime       = null;
    BlockDate           = null;
    TXAnchor            = null;
    Tags                = null;
    Errors              = null;
    DataFetched         = false;
    
    InfoFields = 
    [
        "Type",
        "Network",
        "TXID",             
        "Owner",            
        "Target",
        "Fee_AR",           
        "Fee_Winston",        
        "Quantity_AR",      
        "Quantity_Winston", 
        "DataSize_Bytes",   
        "TagsTotalSizeB",
        "DataRoot",         
        "DataLocation",             
        "BlockID",
        "BlockDate",
        "BlockHeight",        
        "BlockUNIXTime",        
        "TXAnchor",     
        "Tags",                
        "State",
        "FetchedVia",
        "Warnings",
        "Errors",        
    ];      
      
    // Use the by name -object under normal circumstances, do a listing if there are multiple tags with the same name.
    CustomFieldFuncs = 
    { 
        "Tags":           function (t) { return t?.Tags?.HasDuplicates () ? t.Tags.GetList () : t?.Tags?.GetNameValueObj () },
        "Target":         function (t) { return t?.HasRecipient        () ? t.GetRecipient () : "NONE" },
        "FetchedVia":     function (t) { return t?.GQL_Edge != null ? t?.ArweaveTX != null ?"GQL + GET" : "GQL" : t?.ArweaveTX != null ? "GET" : null},
        "TagsTotalSizeB": function (t) { return t?.Tags?.GetTotalBytes (); }  
    };
    
    RecursiveFields = ["Tags", "State", "Warnings", "Errors"]


    /** Overridable. This implementation does nothing. */
    __OnTXFetched () {}


    constructor (txid = null)
    {
        super ();
        this.SetTXID (txid);
    }


    static async FROM_GQL_EDGE   (edge)       { return edge != null ? await new Transaction ().SetGQLEdge   (edge)       : null;      }
    static async FROM_ARWEAVE_TX (arweave_tx) { return edge != null ? await new Transaction ().SetArweaveTX (arweave_tx) : null;      }
    
    
      
    GetTXID                  ()         { return this.TXID;                                                                           }
    GetOwner                 ()         { return this.Owner;                                                                          }
    GetBlockID               ()         { return this.BlockID;                                                                        }
    GetBlockHeight           ()         { return this.BlockHeight;                                                                    }
    GetBlockTime             ()         { return this.BlockUNIXTime;                                                                  }
    GetDate                  ()         { return this.BlockUNIXTime    != null ? Util.GetDate (this.BlockUNIXTime) : null;            }
    GetFee_AR                ()         { return this.Fee_AR           != null ? this.Fee_AR           : 0;                           }
    GetQTY_AR                ()         { return this.Quantity_AR      != null ? this.Quantity_AR      : 0;                           }
    GetFee_Winston           ()         { return this.Fee_Winston      != null ? this.Fee_Winston      : 0;                           }
    GetQTY_Winston           ()         { return this.Quantity_Winston != null ? this.Quantity_Winston : 0;                           }    
    GetDataSize_B            ()         { return this.DataSize_Bytes   != null ? this.DataSize_Bytes   : 0;                           }    
    HasFee                   ()         { return this.Fee_AR           != null && this.Fee_AR          > 0;                           }
    HasTransfer              ()         { return this.Quantity_AR      != null && this.Quantity_AR     > 0;                           }
    HasData                  ()         { return this.DataSize_Bytes   != null && this.DataSize_Bytes  > 0;                           }
    HasRecipient             ()         { return this.Recipient != null && this.Recipient != "";                                      }
    GetRecipient             ()         { return this.HasRecipient   () ? this.Recipient : null;                                      }
    HasTag                   (tag, val) { return this.Tags?.HasTag   (tag, val);                                                      }    
    GetTag                   (tag)      { return this.Tags?.GetTag   (tag);                                                           }        
    GetTagValue              (tag)      { return this.Tags?.GetValue (tag);                                                           }        
    GetTags                  ()         { return this.Tags;                                                                           }        
    IsNewerThan              (tx)       { return this.GetBlockHeight        () > tx?.GetBlockHeight ()                                }        
    IsOlderThan              (tx)       { return this.GetBlockHeight        () < tx?.GetBlockHeight ()                                }        
    IsMined                  ()         { return this.Status?.IsMined       ()                                                        }
    IsPending                ()         { return this.Status?.IsPending     ()                                                        }
    IsFailed                 ()         { return this.Status?.IsFailed      ()                                                        }
    IsConfirmed              ()         { return this.Status?.IsConfirmed   ()                                                        }
    GetStatus                ()         { return this.State;                                                                          }
    async UpdateAndGetStatus ()         { await  this.State.UpdateFromTXID (this.GetTXID () ); this.__OnTXFetched (); return this.State; }


    toString () { return "TX " + this.GetTXID (); }

    
    WithTag (name, value)
    {
        if (this.Tags == null) 
            this.Tags = new TXTagGroup ();

        this.Tags.Add (new TXTag (name, value) );
        
        return this; 
    }

    async FetchAll ()
    {
        if (Settings.IsConcurrentAllowed () )
        {
            Sys.DEBUG ("Running 3 concurrent tasks..");
            const tasks = [
                            this.FetchViaGet (), 
                            this.FetchViaGQL (),
                            this.UpdateAndGetStatus ()
                          ];
            await Promise.all (tasks);
            Sys.DEBUG ("Tasks done.");
        }
        else
        {
            Sys.DEBUG ("Concurrent disabled, running 3 tasks in sequence..")
            await this.FetchViaGet (), 
            await this.FetchViaGQL (),
            await this.UpdateAndGetStatus ()
        }
        
    }

    
    async FetchData (opts = { as_string: false } )
    {
        const txid = this.GetTXID ();

        if (this.IsValid () && txid != null)
        {
            const data = opts?.as_string ? await Arweave.GetTxStrData (txid) 
                                         : await Arweave.GetTxData    (txid);

            if (data == null)
                this.OnError ("Failed to fetch transaction data (as string).", txid);

            else
                this.DataFetched = true;

            return data;
        }
        else
            this.OnErrorOnce ("Unable to fetch data, TX (" + txid + ") not in valid state.", "Transaction.FetchStrData");

        return null;
    }
    async FetchDataStr () { const r = await this.FetchData ({as_string: true}); return r; }


    SetTXID (txid)
    {
        if (txid == null)
            return;

        const current_txid = this.GetTXID ();

        if (current_txid != null && txid != current_txid)
            this.OnError ("TXID mismatch on setting from QGL-edge: Was " + current_txid + ", tried to set as " + txid, "Transaction");
            
        else
            this.TXID = txid;

        this.Valid = this.TXID != null && Util.IsArweaveHash (this.TXID);

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
            
            this.__SetField ("BlockID"            , edge.node?.block?.id         != null ? edge.node.block.id                  : null);
            this.__SetField ("BlockHeight"        , edge.node?.block?.height     != null ? Number (edge.node.block.height)     : null);
            this.__SetField ("BlockUNIXTime"      , edge.node?.block?.timestamp  != null ? Number (edge.node.block.timestamp)  : null);     
            this.__SetField ("BlockDate"          , this.GetDate ()                                                                  );     
            this.__SetField ("Tags"               , TXTagGroup.FROM_QGL_EDGE (edge)                                                  );
            
            this.__SetField ("Fee_Winston"        , edge.node?.fee?.winston      != null ? Number (edge.node.fee.winston)      : null);
            this.__SetField ("Fee_AR"             , edge.node?.fee?.ar           != null ? Number (edge.node.fee.ar)           : null);
            this.__SetField ("Quantity_Winston"   , edge.node?.quantity?.winston != null ? Number (edge.node.quantity.winston) : null);
            this.__SetField ("Quantity_AR"        , edge.node?.quantity?.ar      != null ? Number (edge.node.quantity.ar)      : null);
            this.__SetField ("DataSize_Bytes"     , edge.node?.data?.size        != null ? Number (edge.node.data.size)        : null);

            this.Validate ();
            this.__OnTXFetched ();
        }

        return this;
    }


    async SetArweaveTX (arweave_tx)
    {        
        this.ArweaveTX = arweave_tx;

        const config = State.GetConfig ();

        if (config.MaxTXFormat == null || arweave_tx.format <= config.MaxTXFormat || Settings.IsForceful () )
        {            
            this.SetTXID      (arweave_tx.id);
            this.SetOwner     (await Arweave.OwnerToAddress (arweave_tx.owner) );   
            
            this.__SetField ("Recipient"        , Arweave.GetRecipient (arweave_tx)                   );
            this.__SetField ("Fee_Winston"      , Number (arweave_tx.reward)                          );
            this.__SetField ("Fee_AR"           , Number (Arweave.WinstonToAR (arweave_tx.reward))    );
            this.__SetField ("Quantity_Winston" , Number (arweave_tx.quantity)                        );
            this.__SetField ("Quantity_AR"      , Number (Arweave.WinstonToAR (arweave_tx.quantity))  );
            this.__SetField ("DataSize_Bytes"   , Number (arweave_tx.data_size)                       );
            this.__SetField ("DataRoot"         , arweave_tx.data_root                                );            
            this.__SetField ("TXAnchor"         , arweave_tx.last_tx                                  );            
            this.__SetField ("Tags"             , TXTagGroup.FROM_ARWEAVETX (arweave_tx)              );    
            

            this.__SetField ("DataLocation"     , arweave_tx.data?.length > 0 ? Util.IsSet (arweave_tx.data_root) ? "TX + DataRoot" : "TX" 
                                                 : Util.IsSet (arweave_tx.data_root) ? "DataRoot" : "NO DATA" );
                                                 
            this.Validate ();
            this.__OnTXFetched ();
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


    

    async FetchViaGet (txid = null)
    {
        if (this.ArweaveTX != null)
        {
            Sys.DEBUG ("Already fetched via get.", this.GetTXID () );
            return true;
        }

        if (txid != null)
            this.SetTXID (txid);

        else if ( (txid = this.GetTXID ()) == null)
            return Sys.OnProgramError ("TXID not supplied.", "Transaction.FetchFromArweave");

        const arweave_tx = await Arweave.GetTx (txid);
        
        if (arweave_tx != null)
        {
            await this.SetArweaveTX (arweave_tx);
            return true;
        }

        else
            return this.OnError ("Failed to fetch " + txid + " via GET!", "Transaction.FetchViaGet");
            
        
    }

    async FetchViaGQL (txid = null)
    {
        if (this.GQL_Edge != null)
        {
            Sys.DEBUG ("Already fetched via GQL.", this.GetTXID () );
            return true;
        }

        if (txid != null)
            this.SetTXID (txid);

        else if ( (txid = this.GetTXID ()) == null)
            return Sys.OnProgramError ("TXID not supplied.", "Transaction.FetchViaGQL");

        const query = new ByTXQuery (Arweave);        
        const gql_edge = await query.Execute (txid);
        
        if (gql_edge != null)
        {
            await this.SetGQLEdge (gql_edge)
            return true;
        }

        else
            return this.OnError ("Failed to fetch " + txid + " via GQL!", "Transaction.FetchViaGQL");
                    
    }

}


   

module.exports = Transaction;