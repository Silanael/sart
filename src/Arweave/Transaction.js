//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// STransaction.js - 2021-11-26
// SART transaction object
//

const CONSTANTS    = require ("../CONSTANTS.js");
const SETTINGS     = require ("../SETTINGS").SETTINGS;
const State        = require ("../ProgramState.js");
const Settings     = require ('../Config.js');
const Util         = require ('../Util.js');
const Sys          = require ('../System.js');
const Arweave      = require ("./Arweave.js");
const TXTag        = require ("./TXTag.js");
const TXTagGroup   = require ("./TXTagGroup");
const TXStatus     = require ("./TXStatus.js");
const SARTObject   = require ("../SARTObject.js");
const SARTGroup    = require ("../SARTGroup");
const ByTXQuery    = require ("../GQL/ByTXQuery");
const Concurrent   = require ("../Concurrent");
const Field        = require ("../FieldDef");
const FetchDef     = require ("../FetchDef");
const FieldList    = require ("../FieldList");


const FETCH_GQL    = new FetchDef ("GraphQL", async function (t) { await t.FetchViaGQL        (); } );
const FETCH_GET    = new FetchDef ("GET",     async function (t) { await t.FetchViaGet        (); } );
const FETCH_STATUS = new FetchDef ("Status",  async function (t) { await t.UpdateAndGetStatus (); } );    


const FETCHDEFS = new SARTGroup ().With
(
    FETCH_GQL,    
    FETCH_GET,
    FETCH_STATUS,        
);




const FIELDS = new FieldList ().With 
(

    new Field ("ObjectType")      
        .WithAliases ("ObjType","OType"),

    new Field ("Network")         
        .WithAliases ("NET"),

    new Field ("TXID")            
        .WithAliases ("ID", "TransactionID", "Transaction_ID"),

    new Field ("Owner")           
        .WithAliases ("Address", "Arweave-address", "Wallet")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),         

    new Field ("OwnerShort")      
        .WithAliases ("OwnerS", "AddressShort", "AddrShort", "AddressS", "AddrS", "WalletShort", "WalletS")
        .WithFunction (function (t) { return Util.GetShortArweaveHash (t?.GetOwner () ) } )
        .WithInheritFetch ("Owner"),

    new Field ("Flags")           
        .WithFunction  (function (t) { return t.GetFlagStr (); } )
        .WithFetch (FETCH_GQL),    

    new Field ("FlagsInt")        
        .WithFunction  (function (t) { return t.GetFlagInt (); } )
        .WithInheritFetch ("Flags"),

    new Field ("Target")          
        .WithAliases   ("Recipient", "Destination", "Dest", "Recv")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("TargetShort")     
        .WithAliases   ("RecipientShort", "DestinationShort", "DestShort", "RecvShort", "RecvS", "DestS")
        .WithFunction  (function (t) { return Util.GetShortArweaveHash (t?.GetRecipient () ) })
        .WithInheritFetch ("Target"),        

    new Field ("Fee_AR")          
        .WithAliases   ("Fee_AR")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("Fee_Winston")     
        .WithAliases ("Fee", "Fee_W")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),  

    new Field ("Quantity_AR")     
        .WithAliases   ("QTY_AR", "TransferAmount_AR")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("Quantity_Winston")
        .WithAliases ("QTY", "QTY_W", "TransferAmount", "TransferAmount_Winston", "TransferAmount_W")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL), 

    new Field ("DataSize_Bytes")  
        .WithAliases   ("DataSize", "DataBytes", "Bytes", "Size", "SizeB", "Size_B")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("Total_AR")        
        .WithFunction  (function (t) { return t?.GetTotalAR (); } )
        .WithAliases ("Total_AR, TotalAR, TotalCost_AR, TotalCostAR", "AR_Total", "ARTotal")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("Total_Winston")   
        .WithFunction  (function (t) { return t?.GetTotalWinston (); } )
        .WithAliases ("Total", "Total_W", "TotalW", "TotalCost", "TotalCost_W", "TotalCostW", "WinstonTotal")
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("TagsTotalSizeB")  
        .WithFunction  (function (t) { return t?.Tags?.GetTotalBytes (); } )
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("DataRoot")        
        .WithAliases ("DRoot")
        .WithFetch   (FETCH_GET),

    new Field ("DataLocation")    
        .WithAliases ("DataLoc", "DLoc")
        .WithFetch   (FETCH_GET),

    new Field ("BlockID")         
        .WithAliases ("Block")
        .WithFetch   (FETCH_GQL),

    new Field ("BlockTime")       
        .WithAliases ("Time", "Date", "BDate", "BTime", "BlockT", "BlockD")
        .WithFetch   (FETCH_GQL),

    new Field ("BlockHeight")     
        .WithAliases ("Height",   "BHeight", "BlockH")
        .WithFetch   (FETCH_GQL),

    new Field ("BlockUNIXTime")   
        .WithAliases ("UNIXTime", "UTime")
        .WithFetch   (FETCH_GQL),

    new Field ("TXAnchor")        
        .WithAliases ("LastTX", "Last_TX", "TX_Last")
        .WithFetch   (FETCH_GQL),

    new Field ("Tags")            
        .WithFunction  (function (t) { return t?.Tags?.AsArray (); } )
        .WithFetch_AnyOf (FETCH_GET, FETCH_GQL),

    new Field ("ContentType")     
        .WithFunction     (function (t) { return t?.GetTags()?.GetByName ("Content-Type")?.GetValue (); } )
        .WithAliases      ("Content-Type","CType","MIMEtype", "MIME")
        .WithInheritFetch ("Tags"),

    new Field ("IsInBundle")      
        .WithAliases   ("Bundled", "IsBundled").WithFunction ( function (t) { return t.IsInBundle (); } )
        .WithFetch   (FETCH_GQL),

    new Field ("BundleTXID")      
        .WithAliases   ("Bundle", "InBundle")
        .WithInheritFetch ("IsInBundle"),

    new Field ("Condition")         
        .WithFunction  (function (t) { return t?.GetConditionStr   (); } )
        .WithFetch (FETCH_STATUS),
    
    new Field ("Status")         
        .WithFunction  (function (t) { return t?.GetStatusStr      (); } )
        .WithFetch (FETCH_STATUS),        

    new Field ("StatusCode")      
        .WithFunction  (function (t) { return t?.GetStatusCode     (); } )
        .WithInheritFetch ("StatusText"),

    new Field ("Confirmations")   
        .WithFunction  (function (t) { return t?.GetConfirmations  (); } )
        .WithInheritFetch ("StatusText"),

    new Field ("StatusText")         
        .WithFunction  (function (t) { return t?.GetStatusText     (); } )
        .WithFetch (FETCH_STATUS),
            
        
    new Field ("Warnings")       
        .WithAliases ("WARN")
        .WithNullDisplayValue ("NONE"),

    new Field ("Errors")        
        .WithAliases ("ERR")
        .WithNullDisplayValue ("NONE"),                  
      
)




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
    BlockTime           = null;
    TXAnchor            = null;
    Tags                = null;    
    DataFetched         = false;
    IsLogical           = null;
    BundleTXID          = null;
    
    static FIELDS                  = FIELDS;
    static FIELDS_DEFAULTS         = SARTObject._FIELDS_CREATEOBJ (null, ["time","txid","flags","ctype","DestShort","qty_ar","fee_ar"]);
    static FIELDS_SETTINGKEYS      = SARTObject._FIELDS_CREATEOBJ ("Fields_Transaction_Table", "Fields_Transaction_Entries");
    static FETCHDEFS               = FETCHDEFS;
    
    /** Overridable. This implementation does nothing. */
    __OnTXFetched () {};               


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
    GetID                    ()         { return this.GetTXID ();                                                                     }
    GetOwner                 ()         { return this.Owner;                                                                          }
    GetBlockID               ()         { return this.BlockID;                                                                        }
    GetBlockHeight           ()         { return this.BlockHeight;                                                                    }
    GetBlockTime             ()         { return this.BlockUNIXTime;                                                                  }
    GetDate                  ()         { return this.BlockUNIXTime    != null ? Util.GetDate (this.BlockUNIXTime) : null;            }
    GetFee_AR                ()         { return this.Fee_AR           != null ? this.Fee_AR           : 0;                           }
    GetQTY_AR                ()         { return this.Quantity_AR      != null ? this.Quantity_AR      : 0;                           }    
    GetFee_Winston           ()         { return this.Fee_Winston      != null ? this.Fee_Winston      : 0;                           }
    GetQTY_Winston           ()         { return this.Quantity_Winston != null ? this.Quantity_Winston : 0;                           }    
    GetTotalAR               ()         { return this.GetFee_AR      ()        + this.GetQTY_AR      ();                              }
    GetTotalWinston          ()         { return this.GetFee_Winston ()        + this.GetQTY_Winston ();                              }
    GetDataSize_B            ()         { return this.DataSize_Bytes   != null ? this.DataSize_Bytes   : 0;                           }    
    GetStatusStr             ()         { return this.State?.GetStatusStr     ();                                                     }
    GetStatusCode            ()         { return this.State?.GetStatusCode    ();                                                     }    
    GetStatusText            ()         { return this.State?.GetStatusText    ();                                                     }    
    GetConfirmations         ()         { return this.State?.GetConfirmations ();                                                     }            
    GetConditionStr          ()         { return this.State?.GetConditionStr  ();                                                     }        
    HasFee                   ()         { return this.Fee_AR           != null && this.Fee_AR           > 0;                          }
    HasTransfer              ()         { return this.Quantity_AR      > 0     || this.Quantity_Winston > 0;                          }
    HasData                  ()         { return this.DataSize_Bytes   != null && this.DataSize_Bytes   > 0;                          }    
    DataLoaded               ()         { return this.DataSize_Bytes   != null && this.DataSize_Bytes   > 0;                          }
    HasRecipient             ()         { return Util.IsSet (this.Target);                                                            }
    GetRecipient             ()         { return this.HasRecipient   () ? this.Target : null;                                         }
    IsBundle                 ()         { return this.HasTag (CONSTANTS.TXTAGS.BUNDLE_FORMAT);                                        }
    IsInBundle               ()         { return this.IsLogical;                                                                      }
    GetBundleTXID            ()         { return this.BundleTXID;                                                                     }
    HasTag                   (tag, val) { return this.Tags?.HasTag   (tag, val);                                                      }    
    GetTag                   (tag)      { return this.Tags?.GetTag   (tag);                                                           }        
    GetTagValue              (tag)      { return this.GetTag ()?.GetValue ();                                                         }        
    GetTags                  ()         { return this.Tags;                                                                           }        
    GetTagsAsArray           ()         { return this.Tags != null ? this.Tags.AsArray () : [];                                       }        
    IsNewerThan              (tx)       { return this.GetBlockHeight        () > tx?.GetBlockHeight ()                                }        
    IsOlderThan              (tx)       { return this.GetBlockHeight        () < tx?.GetBlockHeight ()                                }            
    IsMined                  ()         { return this.State?.IsMined       ()                                                         }
    IsPending                ()         { return this.State?.IsPending     ()                                                         }
    IsFailed                 ()         { return this.State?.IsFailed      ()                                                         }
    IsConfirmed              ()         { return this.State?.IsConfirmed   ()                                                         }
    GetState                 ()         { return this.State;                                                                          }
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

    GetFlagInt ()
    {
        let flags = super.GetFlagInt ();
        
        if (this.HasData      () ) flags |= CONSTANTS.FLAGS.TX_HASDATA
        if (this.HasTransfer  () ) flags |= CONSTANTS.FLAGS.TX_HASTRANSFER;
        if (this.IsBundle     () ) flags |= CONSTANTS.FLAGS.TX_ISBUNDLE;
        if (this.IsInBundle   () ) flags |= CONSTANTS.FLAGS.TX_ISLOGICAL;

        return flags;
    }

    GetFlagStr ()
    {
        const flags = this.GetFlagInt ();
        const islog = this.IsInBundle ();

        const bun = (flags & CONSTANTS.FLAGS.TX_ISBUNDLE    ) != 0 ? "B" : "-";
        const log = islog == true ? "L" : islog == false ? "-" : "?";
        const dat = (flags & CONSTANTS.FLAGS.TX_HASDATA     ) != 0 ? "D" : "-";
        const tra = (flags & CONSTANTS.FLAGS.TX_HASTRANSFER ) != 0 ? "T" : "-";        
        const err = (flags & CONSTANTS.FLAGS.HASERRORS      ) != 0 ? "E" : (flags & CONSTANTS.FLAGS.HASWARNINGS) != 0 ? "W" : "-";

        return tra + bun + dat + log + err;
    }
 
    
    WithTag (name, value)
    {
        if (this.Tags == null) 
            this.Tags = new TXTagGroup ();

        this.Tags.Add (new TXTag (name, value) );
        
        return this; 
    }

  
    async FetchData (opts = { as_string: false } )
    {
        const txid = this.GetTXID ();

        if (this.IsValid () && txid != null)
        {       
            Sys.VERBOSE ("Fetching transaction data...", this);

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
            
            this.__SetObjectProperty ("Target"             , edge.node?.recipient         != null ? edge.node.recipient                 : null);
            this.__SetObjectProperty ("BlockID"            , edge.node?.block?.id         != null ? edge.node.block.id                  : null);
            this.__SetObjectProperty ("BlockHeight"        , edge.node?.block?.height     != null ? Number (edge.node.block.height)     : null);
            this.__SetObjectProperty ("BlockUNIXTime"      , edge.node?.block?.timestamp  != null ? Number (edge.node.block.timestamp)  : null);     
            this.__SetObjectProperty ("BlockTime"          , this.GetDate ()                                                                  );     
            this.__SetObjectProperty ("Tags"               , TXTagGroup.FROM_QGL_EDGE (edge)                                                  );
            
            this.__SetObjectProperty ("Fee_Winston"        , edge.node?.fee?.winston      != null ? Number (edge.node.fee.winston)      : null);
            this.__SetObjectProperty ("Fee_AR"             , edge.node?.fee?.ar           != null ? Number (edge.node.fee.ar)           : null);
            this.__SetObjectProperty ("Quantity_Winston"   , edge.node?.quantity?.winston != null ? Number (edge.node.quantity.winston) : null);
            this.__SetObjectProperty ("Quantity_AR"        , edge.node?.quantity?.ar      != null ? Number (edge.node.quantity.ar)      : null);
            this.__SetObjectProperty ("DataSize_Bytes"     , edge.node?.data?.size        != null ? Number (edge.node.data.size)        : null);
            this.__SetObjectProperty ("BundleTXID"         , edge.node?.bundledIn?.id     != null ? edge.node.bundledIn.id              : null);

            this.IsLogical = this.BundleTXID != null;

            this.Validate ();
            this.__OnTXFetched ();
            this.DataLoaded = true;
        }

        return this;
    }


    async SetArweaveTX (arweave_tx)
    {        
        this.ArweaveTX = arweave_tx;        
        const config = State.GetGlobalConfig ();

        if (config.MaxTXFormat == null || arweave_tx.format <= config.MaxTXFormat || Settings.IsForceful () )
        {            
            this.SetTXID      (arweave_tx.id);
            this.SetOwner     (await Arweave.OwnerToAddress (arweave_tx.owner) );   
            
            this.__SetObjectProperty ("Target"           , Arweave.GetRecipient (arweave_tx)                   );
            this.__SetObjectProperty ("Fee_Winston"      , Number (arweave_tx.reward)                          );
            this.__SetObjectProperty ("Fee_AR"           , Number (Arweave.WinstonToAR (arweave_tx.reward))    );
            this.__SetObjectProperty ("Quantity_Winston" , Number (arweave_tx.quantity)                        );
            this.__SetObjectProperty ("Quantity_AR"      , Number (Arweave.WinstonToAR (arweave_tx.quantity))  );
            this.__SetObjectProperty ("DataSize_Bytes"   , Number (arweave_tx.data_size)                       );
            this.__SetObjectProperty ("DataRoot"         , arweave_tx.data_root                                );            
            this.__SetObjectProperty ("TXAnchor"         , arweave_tx.last_tx                                  );            
            this.__SetObjectProperty ("Tags"             , TXTagGroup.FROM_ARWEAVETX (arweave_tx)              );    
            

            this.__SetObjectProperty ("DataLocation"     , arweave_tx.data?.length > 0 ? Util.IsSet (arweave_tx.data_root) ? "TX + DataRoot" : "TX" 
                                                 : Util.IsSet (arweave_tx.data_root) ? "DataRoot" : "NO DATA" );
                                                 
            this.Validate ();
            this.__OnTXFetched ();
            this.DataLoaded = true;
        }
        else
            this.OnError ("Unsupported transaction format/version '" + arweave_tx.format + "'. Use --force to process anyway.", "Transaction.SetArweaveTXData",
                        { error_id: CONSTANTS.ERROR_IDS.TXFORMAT_UNSUPPORTED } );
    
        return this;
    }


    Validate ()
    {
        if ( this.HasTransfer () && !this.HasRecipient () )
            this.OnError ("Quantity set to " + this.Quantity_Winston + " (W) but recipient missing.");        
    }


    
    async FetchViaGet (txid = null)
    {
        Sys.VERBOSE ("Fetching transaction info via HTTP GET..", this);

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

        Sys.VERBOSE ("Fetching transaction info via GraphQL..", this);

        if (this.GQL_Edge != null)
        {
            Sys.DEBUG ("Already fetched via GraphQL.", this.GetTXID () );
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


   
FIELDS.WithSetClassToAll (Transaction);
module.exports = Transaction;