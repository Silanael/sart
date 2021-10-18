//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFS.js - 2021-10-17_01
// Code to deal with ArFS-compatible transactions.
//

// Imports
const Arweave  = require ('./arweave.js');
const Sys      = require ('./sys.js');
const Settings = require ('./settings.js');
const Util     = require ('./util.js');


// Constants
const TAG_FILEID = "File-Id";



async function GetDriveARFSMetadataEntries (drive_id)
{
    const tags = [ {"name":"Drive-Id", "values":drive_id} ];

    txs = await Arweave.GetTXsForAddress (undefined, tags);
    return txs;    
}


async function DownloadFile (args)
{
    // No file ID given
    if (args.length <= 0)
        Sys.ERR_MISSING_ARG ();

    else
    {
        const file_id = args[0];
        const arweave = await Arweave.Init ();

        Sys.VERBOSE ("Searching for File-Id: " + file_id);
        const files = await arweave.transactions.search (TAG_FILEID, file_id);

        if (files.length <= 0)
            Sys.ERR_FATAL ("File-Id '" + file_id + "' not found!");

        else if (files.length > 1)
        {
            Sys.ERR ("Multiple files found:");
            Sys.ERR_FATAL (files);
        }

        else
        {
            await arweave.transactions.getData (files[0], {decode: true, string: true} )
                .then ( data => { Sys.OUT_BIN (data) } );
                            
        }

    }
}


async function ListDriveFiles (drive_id)
{
    const txs = await GetDriveARFSMetadataEntries (drive_id);

    const len = txs.length;
    for (let C = 0; C < len; ++C)
    {        
        let data = await Arweave.GetTxStrData (txs[C].node.id );
        Sys.OUT_TXT (data); 
    }
    
}


module.exports = { ListDriveFiles, DownloadFile };