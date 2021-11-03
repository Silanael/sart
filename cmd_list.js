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


const SUBCOMMANDS =
{   
    "address"     : ListAddress,     
    "drive"       : ListDrive,
    "drives"      : ListDrives,
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
    args.RequireAmount (1);

    const target = args.Pop ();
    let arfs_url = null;
    

    if (target == "gen")
        await ListDrive2Multi (args, null);

    // Arweave-hash   
    else if (Util.IsArweaveHash (target)  )
        await ListAddress (args, target)


    // Check if target is an ArFS-URL    
    else if ( (arfs_url = new ArFS.ArFSURL (target))?.IsValid () )
        await ListARFS (args, arfs_url.drive_id)
    

   
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
                Sys.INFO (e.GetTXID() + " " + Util.GetDate (e.GetBlockTime ()) );
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
        owner: "vpMIIvsJPAwMQvSunhvtcy6j43pYmT7tSB78c5qmEjY",
        sort: GQL.SORT_HEIGHT_DESCENDING,
        tags: [ {name:"Entity-Type",    values: ["file"] } ,
                {name:"Drive-Id", values:"10aec00d-1b33-4187-b470-74fd80e5de43" } ] 
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

async function ListDrive2Multi (args, drive_id = null)
{
   
    const query = new GQL.TXQuery (Arweave);
    await query.ExecuteReqOwner
    ({ 
        owner: "vpMIIvsJPAwMQvSunhvtcy6j43pYmT7tSB78c5qmEjY",        
        sort: GQL.SORT_HEIGHT_DESCENDING,
        tags: [ {name:"Entity-Type",    values: ["file"] } ,
                {name:"Drive-Id", values:"10aec00d-1b33-4187-b470-74fd80e5de43" } ] 
    });

    files        = {};
    failed_files = [];
    const queue  = [];
    let queuepos = 0;


    const start_time = new Date ().getTime ();


    const len = query.GetEntriesAmount ();
    let e, fileid;
    for (let C = 0; C < len; ++C)
    {
        e = query.GetEntry (C);
        fileid = e.GetTag ("File-Id");        

        if (files[fileid] == null)
        {
            // Flush the queue
            if (queuepos >= 50)
            {
                Sys.WARN ("Queue full, awaiting..");
                await Promise.all (queue);
                queuepos = 0;
            }

            queue[queuepos] = HandleFile (e, fileid, C, failed_files);
            queuepos++;
                        
        }
        else
            Sys.WARN ("Omitting older entry for " + fileid);
    }

    await Promise.all (queue);

    if (failed_files.length > 0)
    {
        Sys.OUT_TXT (failed_files.length + " failed fetches:");
        Sys.OUT_TXT (failed_files);
    }

    const duration_sec = (new Date ().getTime () - start_time) / 1000;
    Sys.INFO ("Time taken: " + duration_sec + " sec.");
    
}


async function HandleFile (e, fileid, index, failed_files)
{
    txid = e.GetTXID ();

    let tries = 5;

    while (tries > 0)
    {
        const meta = await Arweave.GetTxStrData (txid);

        if (meta != null)
        {            
            const json = await JSON.parse (meta);
            if (json != null)
            {   
                const data_tx_status = await Arweave.GetTXStatus (json.dataTxId);
                if (data_tx_status != null)
                {
                    files[fileid] = 
                    {
                        name:   json.name,
                        dtxid:  json.dataTxId,
                        state:  data_tx_status.status == 200 ? "OK" :  data_tx_status.status == 404 ? "FAILED" : "PENDING?"
                    }

                    //Sys.INFO ("#" + index + "," + files[fileid].dtxid + "," + files[fileid].name + "," + files[fileid].state);
                    Sys.ERR  ("#" + index + "," + files[fileid].dtxid + "," + files[fileid].name + "," + files[fileid].state);
                    return true;
                }
                else
                    Sys.ERR ("Unable to get data TX status for TXID:" + txid + " - data TXID:" +  json.dataTxId);
            }
            else
                Sys.ERR ("Unable to parse ArFS-metadata for TXID:" + txid);
        }
        else
            Sys.ERR ("Unable to get ArFS-metadata for TXID:" + txid);


        Sys.ERR ("Processing " +  fileid + "(TXID:" + txid  + ") failed, retrying..");
        
        await new Promise (r => setTimeout (r, 3000));
        --tries;
    }

    failed_files.push ( { "File-Id": fileid, "TXID:" : txid, "Index": index } );
}



async function ListARFS (args, arfs_url = null)
{
    if (arfs_url != null)
    {
        const fn_tag = "LIST DRIVE";
        arfs_url = new ArFS.ArFSURL (Util.RequireArgs (args, 1, fn_tag).Pop () );
    }

    const drive = new ArFS.ArFSDrive (arfs_url.DriveID);
    await drive.List (arfs_url); 

    //ArFS.ListDriveFiles (drive_id);
}


async function ListDrives (args)
{
    const fn_tag = "LIST DRIVES";
    
    ArFS.ListDrives (args[0]);

}


module.exports = { HandleCommand, Help, SUBCOMMANDS }