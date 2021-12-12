//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_list.js - 2021-10-18_01
// Command 'list'
//

// Imports
const Constants = require ("../CONSTANTS.js");
const State     = require ("../ProgramState.js");
const Sys       = require ('../System.js');
const Settings  = require ('../Settings.js');
const Util      = require ('../Util.js');
const Arweave   = require ('../Arweave/Arweave.js');
const ArFS      = require ('../ArFS/ArFS.js');
const GQL       = require ('../GQL/GQLQuery.js');
const Listing   = require ('../Listing.js');
const Analyze   = require ('../TXAnalyze.js');


const SUBCOMMANDS =
{   
    "address"     : ListAddress,     
    "arfs"        : ListARFS,
    "drive"       : ListARFS,
    "drives"      : ListDrives,
    "all-drives"  : async function (args) { await ListDrives (args, true); },
    "config"      : function (args) { Sys.OUT_OBJ (State.Config, {recursive_fields: Settings.RECURSIVE_FIELDS }); },
}


function Help (args)
{
    Sys.INFO ("----------");
    Sys.INFO ("LIST USAGE");
    Sys.INFO ("----------");
    Sys.INFO ("");
    Sys.INFO ("List transactions by address:")
    Sys.INFO ("   list <ADDRESS>");
    Sys.INFO ("");
    Sys.INFO ("List ArFS-drives on an Arweave-address:")
    Sys.INFO ("   list <ADDRESS>");
    Sys.INFO ("")
    Sys.INFO ("Scan for broken ArFS-drives:")
    Sys.INFO ("   list <ADDRESS> deep");
    Sys.INFO ("")
    Sys.INFO ("List content of an ArFS-drive:")
    Sys.INFO ("   list drive <DRIVE-ID>");
    Sys.INFO ("");
    Sys.INFO ("List ArFS root directory content:")
    Sys.INFO ("   list arfs <DRIVE-ID>/");
    Sys.INFO ("");
    Sys.INFO ("List ArFS-folder content:")
    Sys.INFO ("   list arfs <DRIVE-ID>/path/<FOLDERNAME>");
    Sys.INFO ("");
    Sys.INFO ("List content of folder and all of its subfolders:")
    Sys.INFO ("   list arfs <DRIVE-ID>/path/<FOLDERNAME>/<FOLDERNAME> -r");
    Sys.INFO ("");
    Sys.INFO ("List config:")
    Sys.INFO ("   list config");
    Sys.INFO ("");
}


// TODO
async function HandleCommand (args)
{
    if (args.GetAmount () <= 0)
    {
        Help ();
        Sys.INFO ("Valid subcommands: " + Util.KeysToStr (SUBCOMMANDS) );
        return false;
    }
    
    const target  = args.Pop ();
    const handler = SUBCOMMANDS[target.toLowerCase () ];

    // Invoke handler if found
    if (handler != null)
    {
        Sys.VERBOSE ("LIST: Invoking subcommand-handler for '" + target + "'...");
        const ret = await handler (args);
        return ret;
    }

    
    let arfs_url = null;
    

    // Arweave-hash   
    if (Util.IsArweaveHash (target)  )
        await ListAddress (args, target)


    // Check if target is an ArFS-URL    
    else if ( (arfs_url = new ArFS.ArFSURL (target))?.IsValid () )
        await ListARFS (args, arfs_url)
     
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




async function ListTXs (args, address = null)
{
    if (address == null)
    {
        if ( ! args.RequireAmount (1, "ListTXs: Transaction ID (TXID) required.") )
            return false;        
        address = Util.Pop ();
    }

    txs = await Arweave.GetTXsForAddress (address); 
    txs.forEach ( tx => { Sys.OUT_TXT (tx.node.id) } );
}





async function ListDrive2 (args, drive_id = null)
{
   
    const query = new GQL.TXQuery (Arweave);
    await query.ExecuteReqOwner
    ({ 
        owner: "<foo>",
        sort: Constants.GQL_SORT_HEIGHT_DESCENDING,
        tags: [ {name:"Entity-Type", values: ["file"] } ,
                {name:"Drive-Id",    values:"<foo>" } ] 
    });

    files = {};

    const len = query.GetEntriesAmount ();
    let e, fileid, txid;
    for (let C = 0; C < len; ++C)
    {
        e = query.GetEntry (C);
        fileid = e.GetTag ("File-Id");
        txid = e.GetTXID ();
        if (files[fileid] == null)
        {
            const meta = await Arweave.GetTxStrData (txid);
            const json = await JSON.parse (meta);
            
            const data_tx_status = await Arweave.GetTXStatus (json.dataTxId);
            
            files[fileid] = 
            {
                name:   json.name,
                dtxid:  json.dataTxId,
                state:  data_tx_status.status == 200 ? "OK" :  data_tx_status.status == 404 ? "FAILED" : "PENDING?"
            }

            Sys.INFO (files[fileid].name + "," + files[fileid].dtxid + "," + files[fileid].state);
            Sys.ERR  (files[fileid].name + "," + files[fileid].dtxid + "," + files[fileid].state);
        }
        else
            Sys.WARN ("Omitting older entry for " + fileid);
    }

    
}





async function ListARFS (args, arfs_url = null)
{    
    if (arfs_url == null)
    {
        if ( ! args.RequireAmount (1, "ArFS-path required, ie. arfs://<drive-id>/path/Images") )
            return false;  
        
        arfs_url = new ArFS.ArFSURL (args.Pop () );
    }
    
    const drive = new ArFS.ArFSDrive (arfs_url.GetDriveID () );
    await drive.List (arfs_url); 

    //ArFS.ListDriveFiles (drive_id);
}


async function ListDrives (args, all_drives = false)
{
    let addr = null;
    let deep = false;

    if (!all_drives)
    {
        if (! args.RequireAmount (1, "Arweave-address required.") )
            return false;

        addr = args.Pop ();

        if (addr == null || !Util.IsArweaveHash (addr) )
        {
            Sys.ERR ("Not a valid Arweave-address: " + addr);
            return false;
        }

        if (args.GetAmount () >= 1)        
        {
            const param = args.PopLC ();
            if (param == "deep")
            {
                deep = true;
                Sys.VERBOSE ("Deep scan enabled.");
            }
            else
                return Sys.ERR ("Valid parameters: 'deep' for deep scan.");
        }
        
    }
    
    const query   = new GQL.ArFSDriveQuery (Arweave);        
    const results = all_drives ? await query.Execute (null, false) : await query.Execute (addr, deep);

    if (results != null)
    {
        Sys.OUT_OBJ (results.Info, { recursive_fields: results.RECURSIVE_FIELDS } );
        Sys.INFO ("")
        if (!deep && !all_drives)
            Sys.INFO (`(Use "LIST DRIVES <address> DEEP" for deep scan to find broken drives)`);
    }
    else
        Sys.ERR ("Drive query failed for some reason.", "ListDrives");


    //ArFS.ListDrives (args[0]);
}


module.exports = { HandleCommand, Help, SUBCOMMANDS }