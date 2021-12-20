//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// CMD_List.js - 2021-12-11_01
// Command 'list'
//

const Sys        = require ("../System");
const Util       = require ("../Util");
const Constants  = require ("../CONSTANTS");
const ArgDef     = require ("../Arguments").ArgDef;
const CommandDef = require ("../CommandDef").CommandDef;
const TXQuery    = require ("../GQL/TXQuery");
const TXGroup    = require ("../Arweave/TXGroup");
const Arweave    = require ("../Arweave/Arweave");
const Analyze    = require ("../Features/TXAnalyze");


class CMD_List extends CommandDef
{
    Name          = "LIST";
    MinArgsAmount = 1;

    Subcommands =
    {
        "ADDRESS"     : new SubCMD_Address (),
        "ARFS"        : null,
        "DRIVE"       : null,
        "DRIVES"      : null,
        "ALL-DRIVES"  : null,
        "CONFIG"      : null,
    }
}


class SubCMD_Address extends CommandDef
{
    Name          = "ADDRESS";
    MinArgsAmount = 1;

    constructor ()
    {
        super ();
        this.WithArgs 
        (
            new ArgDef ("sort")  .WithHasParam ()                               .WithFunc (SubCMD_Address._SetSort),
            new ArgDef ("amount").WithHasParam ()                               .WithFunc (SubCMD_Address._SetAmount),
            new ArgDef ("last")  .WithHasParam ().WithAlias ("latest", "newest").WithFunc (SubCMD_Address._HandleLast),                                                                                            
            new ArgDef ("oldest").WithHasParam ().WithAlias ("first")           .WithFunc (SubCMD_Address._HandleOldest)                                                                           
        );        
    }
  
    
    static _HandleLast (param, cmd)
    {
        return SubCMD_Address._SetAmount (param, cmd) & // DON'T TOUCH!
               SubCMD_Address._SetSort   (Constants.GQL_SORT_NEWEST_FIRST, cmd)
    }

    static _HandleOldest (param, cmd)
    {
        return SubCMD_Address._SetAmount (param, cmd) & // DON'T TOUCH!
               SubCMD_Address._SetSort   (Constants.GQL_SORT_OLDEST_FIRST, cmd)
    }

    static _SetAmount (amount, cmd)
    {
        if (amount == null)
            return cmd.OnProgramError ("_SetAmount: 'amount' null.");

        else if (Util.StrCmp (amount, "all", true) )
        {
            cmd.First = null;
            Sys.INFO ("Might want to omit the amount-parameter entirely to get all entries. But this works too.");
        }
        else if (isNaN (amount) )
            return cmd.OnError ("Invalid amount '" + amount + "' - must be a number. ")

        else
        {
            cmd.First = amount;
            return true;
        }
        return false;
    }

    static _SetSort (sort, cmd)
    {
        switch (sort)
        {
            case "asc":
            case "ascending":
            case "oldest":
                cmd.Sort = Constants.GQL_SORT_HEIGHT_ASCENDING;
                return true;
                

            case "desc":
            case "descending":
            case "newest":
                cmd.Sort = Constants.GQL_SORT_HEIGHT_DESCENDING;
                return true;
                

            default:                    
                cmd.Sort = sort;

                if (!Constants.IS_GQL_SORT_VALID (sort) && ! Sys.ERR_OVERRIDABLE ("Unknown sort argument: '" + sort + "'. Use the --force to proceed anyway.") )
                    return false;

                else
                    return true;

        }        
    }

    async OnExecute (cmd)
    {
        if (! cmd.RequireAmount (1, "Arweave-address required.") )
            return false;

        const address = cmd.Pop ();

        if (! Util.IsArweaveHash     (address) && 
            ! cmd.OnOverridableError ("'" + address + "' doesn't seem to be a valid Arweave-address. Use --force to proceed anyway.") )
            return false;

        Sys.DEBUG ("Executing with sort:" + cmd.Sort + " amount:" + cmd.First);

        cmd.Query = new TXQuery (Sys.GetMain().GetArweave () );

        await cmd.Query.ExecuteReqOwner 
        ({ 
            first: cmd.First, 
            owner: address,  
            sort:  cmd.Sort, 
            id:    null
        });

        cmd.Transactions = await TXGroup.FROM_GQLQUERY (cmd.Query);
    }

    OnOutput (cmd)
    {
        if (cmd.Transactions != null)
        {
            let size_bytes_total  = 0;
            let fee_winston_total = 0;
            let qty_winston_total = 0;
                    
            const amount = cmd.Transactions.GetAmount ();
            if (amount > 0)
            {
                for (const t of cmd.Transactions.AsArray () )
                {                        
                    size_bytes_total   += t.GetDataSize_B  ();
                    fee_winston_total  += t.GetFee_Winston ();
                    qty_winston_total  += t.GetQTY_Winston ();
    
                    //t.Output ( {UseListMode: true, WantedFields: ["TXID", "Owner"] } );
                    //Sys.OUT_TXT (t.GetTXID () + " " + Util.GetDate (t.GetBlockTime () ) + " " + flags + " " + Analyze.GetTXDescription (t) );
                }

                cmd.Transactions.Output ( {UseListMode: true, WantedFields: ["TXID", "Owner"] } );

                Sys.INFO ("---");
                Sys.INFO ("Listed " + amount + " transactions with total of " 
                            + Arweave.WinstonToAR (qty_winston_total)      + " AR transferred, "
                            + Util.GetSizeStr     (size_bytes_total, true) + " of data stored and "
                            + Arweave.WinstonToAR (fee_winston_total)      + " AR spent in transaction fees.");
            }
            else
                Sys.INFO ("Address " + address + " has no transactions.");
            
        }
    }
}





async function ListAddress (args, address = null)
{
    
    if (address == null)
    {
        if ( ! args.RequireAmount (1, "ListAddress: Arweave-address required.") )
            return false;  
        
        address = args.Pop ();
    }

    const query_args =
    {
        owner: address,
        sort:  Constants.GQL_SORT_OLDEST_FIRST,
        tags:  []
    }
    

    // Process additional parameters
    while (args?.HasNext () )
    {
        let arg;
        switch (arg = args.PopLC ())
        {            
            case "amount":
            case "first":
                if ( ! args.RequireAmount (1, "FIRST/AMOUNT: Number of entries required."))
                    return false;

                query_args.first = args.Pop ();
                break;

            case "sort":
                if ( ! args.RequireAmount (1, "Valid values: asc/ascending/oldest, desc/descending/newest."))
                    return false;

                const sort = args.PopLC ();

                switch (sort)
                {
                    case asc:
                    case ascending:
                    case oldest:
                        query_args.sort = Constants.GQL_SORT_HEIGHT_ASCENDING;
                        break;

                    case desc:
                    case descending:
                    case newest:
                        query_args.sort = Constants.GQL_SORT_HEIGHT_DESCENDING;
                        break;

                    default:                    
                        query_args.sort = sort;
                        if (!QGL.IsValidSort (sort) && ! Sys.ERR_OVERRIDABLE ("Unknown sort argument: '" + sort + "'. Use the --force to proceed anyway.") )
                            return false;                            

                }

            case "last":
            case "latest":
            case "newest":
                if ( ! args.RequireAmount (1, "Number of entries is required."))
                    return false;
                query_args.first = args.Pop ();
                query_args.sort = Constants.GQL_SORT_NEWEST_FIRST;
                
                break;

            case "oldest":
                if ( ! args.RequireAmount (1, "Number of entries is required."))
                    return false;
                query_args.first = args.Pop ();
                query_args.sort = Constants.GQL_SORT_OLDEST_FIRST;
                break;

            default:
                return Sys.ERR_ABORT ("Unknown argument '" + arg + "'.");
        }
        
    }

    Sys.INFO ("Getting transactions for " + address + " ...");
    Sys.DEBUG ("With query args:");
    Sys.DEBUG (query_args);

    const query = await Arweave.GetTXs (query_args);

    size_bytes_total  = 0;
    fee_winston_total = 0;
    qty_winston_total = 0;

    // Print the results if any.    
    let e;
    if (query != null) 
    {
        const amount = query.GetTransactionsAmount ();
        if (amount > 0)
        {
            for (let C = 0; C < amount; ++C)
            {
                e = query.GetTransactionByIndex (C);
                
                const d = e.HasData      () ? "D" : "-";
                const t = e.HasTransfer  () ? "T" : "-";
                const r = e.HasRecipient () ? "R" : "-";
                const flags = d+t+r;

                size_bytes_total   += e.GetDataSize_B  ();
                fee_winston_total  += e.GetFee_Winston ();
                qty_winston_total  += e.GetQTY_Winston ();

                Sys.OUT_TXT (e.GetTXID () + " " + Util.GetDate (e.GetBlockTime () ) + " " + flags + " " + Analyze.GetTXEntryDescription (e) );
            }
            Sys.INFO ("---");
            Sys.INFO ("Listed " + amount + " transactions with total of " 
                      + Arweave.WinstonToAR (qty_winston_total)      + " AR transferred, "
                      + Util.GetSizeStr     (size_bytes_total, true) + " of data stored and "
                      + Arweave.WinstonToAR (fee_winston_total)      + " AR spent in transaction fees.");
        }
        else
            Sys.INFO ("Address " + address + " has no transactions.");
    }
    else    
        return false;
    
    
    return true;
}



module.exports = CMD_List;