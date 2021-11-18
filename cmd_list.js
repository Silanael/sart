//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// cmd_list.js - 2021-10-18_01
// Command 'list'
//

// Imports
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Util     = require ('./util.js');
const Arweave  = require ('./arweave.js');
const ArFS     = require ('./ArFS.js');
const GQL      = require ('./GQL.js');
const Listing  = require ('./Listing.js');
const Analyze  = require ('./TXAnalyze.js');


const SUBCOMMANDS =
{   
    "address"     : ListAddress,     
    "drive"       : ListDrive,
    "drives"      : ListDrives
}


function Help (args)
{
    Sys.INFO ("LIST USAGE");
    Sys.INFO ("----------");
    Sys.INFO ("");
    Sys.INFO ("List transactions:")
    Sys.INFO ("   list <address>");
    Sys.INFO ("");
    Sys.INFO ("List drive content:")
    Sys.INFO ("   list <drive-id>");
    Sys.INFO ("");
    Sys.INFO ("List root directory content:")
    Sys.INFO ("   list <drive-id>/");
    Sys.INFO ("");
    Sys.INFO ("List folder content:")
    Sys.INFO ("   list <drive-id>/path/<folder>/<folder>");
    Sys.INFO ("");
    Sys.INFO ("List content of folder and all of its subfolders:")
    Sys.INFO ("   list <drive-id>/path/<folder>/<folder> -r");
    Sys.INFO ("");
}


// TODO
async function HandleCommand (args)
{
    if ( ! args.RequireAmount (1, "Can be an address, an ArFS Drive-ID or a path like <drive-id>/path/Images ."))
        return false;

    
    const target = args.Pop ();
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
        sort:  GQL.SORT_OLDEST_FIRST,
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
                        query_args.sort = GQL.SORT_HEIGHT_ASCENDING;
                        break;

                    case desc:
                    case descending:
                    case newest:
                        query_args.sort = GQL.SORT_HEIGHT_DESCENDING;
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
                query_args.sort = GQL.SORT_NEWEST_FIRST;
                
                break;

            case "oldest":
                if ( ! args.RequireAmount (1, "Number of entries is required."))
                    return false;
                query_args.first = args.Pop ();
                query_args.sort = GQL.SORT_OLDEST_FIRST;
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
        const amount = query.GetEntriesAmount ();
        if (amount > 0)
        {
            for (let C = 0; C < amount; ++C)
            {
                e = query.GetEntry (C);
                
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




async function ListDrive (args, drive_id = null)
{
    if (drive_id != null)
    {
        if ( ! RequireAmount (1, "ListTXs: Transaction ID (TXID) required.") )
            return false;  
        if (! RequireArgs (args, 1, "Drive-ID required.") )
            return false;
        
        drive_id = args.Pop ();
    }

    const drive = new ArFS.ArFSDrive (arfs_url.DriveID);
    await drive.List (arfs_url); 

    //ArFS.ListDriveFiles (drive_id);
}


async function ListDrive2 (args, drive_id = null)
{
   
    const query = new GQL.TXQuery (Arweave);
    await query.ExecuteReqOwner
    ({ 
        owner: "<foo>",
        sort: GQL.SORT_HEIGHT_DESCENDING,
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


async function ListDrives (args)
{
    const fn_tag = "LIST DRIVES";
    
    ArFS.ListDrives (args[0]);

}


module.exports = { HandleCommand, Help, SUBCOMMANDS }