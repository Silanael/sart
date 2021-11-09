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
    args.RequireAmount (1, "Possible commands: " + Util.KeysToStr (SUBCOMMANDS) );

    const target = args.Pop ();
    let arfs_url = null;
    

    if (target == "gen")
        await ListDrive2Multi (args, null);

    // Arweave-hash   
    else if (Util.IsArweaveHash (target)  )
        await ListAddress (args, target)


    // Check if target is an ArFS-URL    
    else if ( (arfs_url = new ArFS.ArFSURL (target))?.IsValid () )
        await ListARFS (args, arfs_url)
    

   
}


async function ListAddress (args, address = null)
{
    if (address == null)
    {
        const fn_tag = "LIST ADDRESS";
        address = Util.RequireArgs (args, 1, fn_tag).Pop ();
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
                query_args.first = args.RequireAmount (1).Pop ();
                break;

            case "sort":
                const sort = args.RequireAmount (1).PopLC ();
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
                        if (!QGL.IsValidSort (sort))
                            Sys.ERR_OVERRIDABLE ("Unknown sort argument: " + sort);

                }

            case "last":
            case "latest":
            case "newest":
                query_args.first = args.RequireAmount (1).Pop ();
                query_args.sort = GQL.SORT_NEWEST_FIRST;
                break;

            case "oldest":            
                query_args.first = args.RequireAmount (1).Pop ();
                query_args.sort = GQL.SORT_OLDEST_FIRST;
                break;

            default:
                Sys.ERR_FATAL ("Unknown argument '" + arg + "'.");
        }
        
    }

    const query = await Arweave.GetTXs (query_args);


    // Print the results if any.
    const amount = query.GetEntriesAmount ();
    let e;
    if (query != null) 
    {
        if (amount > 0)
        {
            for (let C = 0; C < amount; ++C)
            {
                e = query.GetEntry (C);
                
                const d = e.HasData      () ? "D" : "-";
                const t = e.HasTransfer  () ? "T" : "-";
                const r = e.HasRecipient () ? "R" : "-";
                const flags = d+t+r;                
                Sys.INFO (e.GetTXID () + " " + Util.GetDate (e.GetBlockTime ()) + " " + flags + " " + Analyze.GetTXEntryDescription (e) );
            }
        }
        else
            Sys.INFO ("Address " + address + " has no transactions.");
    }
    else
        Sys.ERR ("Failed to fetch transactions for address " + address + " .");
        
}




async function ListTXs (args, address = null)
{
    if (address == null)
    {
        const fn_tag = "LIST TX";
        address = Util.RequireArgs (args, 1, fn_tag).Pop ();
    }

    txs = await Arweave.GetTXsForAddress (address); 
    txs.forEach ( tx => { Sys.OUT_TXT (tx.node.id) } );
}




async function ListDrive (args, drive_id = null)
{
    if (drive_id != null)
    {
        const fn_tag = "LIST DRIVE";
        drive_id = Util.RequireArgs (args, 1, fn_tag).Pop ();
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
        const fn_tag = "LIST DRIVE";
        arfs_url = new ArFS.ArFSURL (args.RequireAmount (1, "ArFS-path").Pop () );
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