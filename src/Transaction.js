//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// STransaction.js - 2021-11-26
// SART transaction object
//

const Constants    = require ("./CONSTANTS.js");
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
const Concurrent   = require ("./Concurrent");
const OutputField  = require ("./OutputField");


const OUTPUT_FIELDS = 
[
    new OutputField ("Type"),
    new OutputField ("Network"),
    new OutputField ("TXID"),
    new OutputField ("Owner"),         
    new OutputField ("Target").WithFunction (function (t) { return t?.HasRecipient () ? t.GetRecipient () : "NONE"} ),
    new OutputField ("Fee_AR"),           
    new OutputField ("Fee_Winston"),        
    new OutputField ("Quantity_AR"),      
    new OutputField ("Quantity_Winston"), 
    new OutputField ("DataSize_Bytes"),
    new OutputField ("TagsTotalSizeB").WithFunction (function (t) { return t?.Tags?.GetTotalBytes (); } ),
    new OutputField ("DataRoot"),         
    new OutputField ("DataLocation"),             
    new OutputField ("BlockID"),
    new OutputField ("BlockDate"),
    new OutputField ("BlockHeight"),        
    new OutputField ("BlockUNIXTime"),        
    new OutputField ("TXAnchor"),     
    new OutputField ("Tags").WithFunction (function (t) { return t?.Tags?.GetList (); } ).WithRecursive (),                
    new OutputField ("State").WithRecursive (),
    new OutputField ("FetchedFrom").WithFunction (function (t) { return t?.GenerateFetchInfo () } ).WithRecursive (),                                        
    new OutputField ("Warnings").WithRecursive (),
    new OutputField ("Errors").WithRecursive (),                  
];


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
    
    OutputFields = OUTPUT_FIELDS;
    

  
    //"Tags":           function (t) { return t?.Tags?.HasDuplicates () ? t.Tags.GetList () : t?.Tags?.GetNameValueObj () },
      
    
    /** Overridable. This implementation does nothing. */
    __OnTXFetched () {}


    constructor (txid = null)
    {
        super ();
        this.SetTXID (txid);
    }


    static       FROM_GQL_EDGE   (edge)       { return edge != null ?       new Transaction ().SetGQLEdge   (edge)       : null;      }
    static async FROM_ARWEAVE_TX (arweave_tx) { return edge != null ? await new Transaction ().SetArweaveTX (arweave_tx) : null;      }
    
    
    /** Overridable. Should be 4 characters. */
    GetTypeShort () { return "TX  "; }
    toString     () { return "TX " + this.GetTXID (); }  

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
    DataLoaded                  ()         { return this.DataSize_Bytes   != null && this.DataSize_Bytes  > 0;                           }
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
    async UpdateAndGetStatus ()         { await  this.State.UpdateFromTXID (this.GetTXID () ); this.DataLoaded = true;return this.State; }


    IsInSameBlockAs (tx)
    { 
        const blk_this = this.GetBlockHeight ();
        const blk_tx   = tx?.GetBlockHeight ();

        if (blk_this == null || blk_tx == null)
            return false;
        else
            return blk_this == blk_tx;
    }


    GenerateFetchInfo ()
    {
        return { "GQL"   : this.GQL_Edge  != null,
                 "GET"   : this.ArweaveTX != null,
                 "Status": this.State?.IsFetched ()
               };
    }

 
    
    WithTag (name, value)
    {
        if (this.Tags == null) 
            this.Tags = new TXTagGroup ();

        this.Tags.Add (new TXTag (name, value) );
        
        return this; 
    }

    async FetchAll ()
    {
        await Promise.all ([ this.FetchViaGet (), this.FetchViaGQL (), this.UpdateAndGetStatus () ]);        
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
            this.OnProgramError ("Owner mismatch on setting from QGL-edge: Was " + current_owner + ", tried to set as " + owner);
                    
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
            
            this.__SetObjectField ("BlockID"            , edge.node?.block?.id         != null ? edge.node.block.id                  : null);
            this.__SetObjectField ("BlockHeight"        , edge.node?.block?.height     != null ? Number (edge.node.block.height)     : null);
            this.__SetObjectField ("BlockUNIXTime"      , edge.node?.block?.timestamp  != null ? Number (edge.node.block.timestamp)  : null);     
            this.__SetObjectField ("BlockDate"          , this.GetDate ()                                                                  );     
            this.__SetObjectField ("Tags"               , TXTagGroup.FROM_QGL_EDGE (edge)                                                  );
            
            this.__SetObjectField ("Fee_Winston"        , edge.node?.fee?.winston      != null ? Number (edge.node.fee.winston)      : null);
            this.__SetObjectField ("Fee_AR"             , edge.node?.fee?.ar           != null ? Number (edge.node.fee.ar)           : null);
            this.__SetObjectField ("Quantity_Winston"   , edge.node?.quantity?.winston != null ? Number (edge.node.quantity.winston) : null);
            this.__SetObjectField ("Quantity_AR"        , edge.node?.quantity?.ar      != null ? Number (edge.node.quantity.ar)      : null);
            this.__SetObjectField ("DataSize_Bytes"     , edge.node?.data?.size        != null ? Number (edge.node.data.size)        : null);

            this.Validate ();
            this.__OnTXFetched ();
            this.DataLoaded = true;
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
            
            this.__SetObjectField ("Recipient"        , Arweave.GetRecipient (arweave_tx)                   );
            this.__SetObjectField ("Fee_Winston"      , Number (arweave_tx.reward)                          );
            this.__SetObjectField ("Fee_AR"           , Number (Arweave.WinstonToAR (arweave_tx.reward))    );
            this.__SetObjectField ("Quantity_Winston" , Number (arweave_tx.quantity)                        );
            this.__SetObjectField ("Quantity_AR"      , Number (Arweave.WinstonToAR (arweave_tx.quantity))  );
            this.__SetObjectField ("DataSize_Bytes"   , Number (arweave_tx.data_size)                       );
            this.__SetObjectField ("DataRoot"         , arweave_tx.data_root                                );            
            this.__SetObjectField ("TXAnchor"         , arweave_tx.last_tx                                  );            
            this.__SetObjectField ("Tags"             , TXTagGroup.FROM_ARWEAVETX (arweave_tx)              );    
            

            this.__SetObjectField ("DataLocation"     , arweave_tx.data?.length > 0 ? Util.IsSet (arweave_tx.data_root) ? "TX + DataRoot" : "TX" 
                                                 : Util.IsSet (arweave_tx.data_root) ? "DataRoot" : "NO DATA" );
                                                 
            this.Validate ();
            this.__OnTXFetched ();
            this.DataLoaded = true;
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
            return this.OnError ("Failed to fetch " + txid + " via GET. It might be inside a bundle.", "Transaction.FetchViaGet");
            
        
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