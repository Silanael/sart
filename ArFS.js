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
const TAG_FILEID        = "File-Id";
const TAG_ENTITYTYPE    = "Entity-Type";
const TAG_CONTENTTYPE   = "Content-Type";
const ENTITYTYPE_FILE   = "file";
const ENTITYTYPE_FOLDER = "folder";
const ENTITYTYPE_DRIVE  = "drive";

const METADATA_CONTENT_TYPES = ["application/json"];


// This maps the lowercase-versions of the TX metadata-tags
// as well as ArFS to class/object variable names.
// Could have just done file[tagname] = tagvalue, but
// wanted to at least try to keep things more tidy.
const TXTAG_VAR_MAP =
{    
    "file-id"           : "FileId",
    "drive-id"          : "DriveId",       
    "parent-folder-id"  : "ParentFolderId",
    "content-type"      : "ContentType_TX",
    "app-name"          : "ArFSAppName",
    "app-version"       : "ArFSAppVersion",
    "unix-time"         : "Date_TX",
    "arfs"              : "ArFSVersion",
    "entity-type"       : "ArFSEntityType"
}

const ARFSMETA_VAR_MAP =
{
    "name"              : "Filename",
    "size"              : "Size_ArFS",
    "lastmodifieddate"  : "Date_ArFS",
    "datatxid"          : "DataTXID",
    "datacontenttype"   : "ContentType_ArFS"
}




async function GetDriveARFSMetadataEntries (drive_id, entity_type)
{    
    const tags = [ {"name":"Drive-Id", "values":drive_id} ];

    if (entity_type != null)
        tags.push ( {"name":"Entity-Type", "values":entity_type} );

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

    const ardrive_fs = 
    {
        "Type"       : "ArDrive",
        "Date"       : Util.GetDate (),
        "UNIXTime"   : Util.GetUNIXTime (),

        "Files"      : [],
        "Folders"    : [],
        "MetaTXIDs"  : [],
        "DataTXIDs"  : [],
        "Root"       : {}
    }

    const txs = await GetDriveARFSMetadataEntries (drive_id, 'file');
    

    const tx_amount = txs.length;
    if (tx_amount > 0)
    {
        Sys.INFO (tx_amount + (tx_amount == 0 ? " ArFS-entry" : " ArFS-entries") + " found from drive " + drive_id + "." );
        Sys.INFO ("Getting metadata for the files..");

        for (let C = 0; C < tx_amount; ++C)
        {       
            let tx = txs[C];
            let txid = tx.node.id;

            Sys.DEBUG ("--- Metadata transaction " + txid + " ---")
            
            let file =
            {                   
                "FileId"           : null,
                "DriveId"          : null,
                "ParentFolderId"   : null,
                "Filename"         : null,
                                
                "Size_ArFS"        : 0,
                "Size_DTX"         : 0,
                "Date_ArFS"        : 0,
                "Date_Tag"         : 0,
   
                "ContentType_TX"   : null,
                "ContentType_ArFS" : null,

                "MetaTXID"         : txid,
                "DataTXID"         : null,
                   
                "Metadata_Tx"      : tx,
                "Metadata_Size"    : tx.data_size,
                "Metadata"         : null,                
                
                "ArweaveTags"      : tx.node.tags
            }
            


            // Parse tags from the transaction
            file.ArweaveTags.forEach
            ( tag => 
            {
                let name  = tag.name;
                let value = tag.value;            
                Sys.DEBUG ("Tag: " + name + "=" + value); 

                file[name] = value;
                
                const name_lower = name.toLowerCase ();
                
                const varname = TXTAG_VAR_MAP[name_lower];
                if (varname != null)
                    file[varname] = value;

                else
                    Sys.WARN ("Unknown Arweave-tag: " + name, txid);
                
            }    
            );


            // Check that the metadata is the expected format
            if (! METADATA_CONTENT_TYPES.includes (file.ContentType_TX.toLowerCase ()) )
            {
                Sys.ERR ("Unknown " + TAG_CONTENTTYPE + ": " + file.ContentType_TX, txid);
                if (!Settings.IsForceful () )
                    Sys.WARN ("Skipping this metadata.", txid);
                    continue;
            }


            // Check that the data-field of the metadata tx is of reasonable size.
            if (file.Metadata_Size > Settings.Config.MetaDataMaxSize)
            {
                Sys.ERR ("Unusually large data field: " + file.Metadata_Size + "B", txid);
                if (!Settings.IsForceful () )
                {
                    Sys.WARN ("Skipping this metadata.", txid);
                    continue;
                }

            }

            // Extract ArFS metadata JSON from the data of the metadata-tx:
            let metadata = await Arweave.GetTxStrData (txid);


            if (Settings.IsDebug () )
                Sys.DEBUG ("TX-data:" + metadata, txid);
                

            let metadata_obj = JSON.parse (metadata);
            let keys         = Object.keys (metadata_obj);
            let values       = Object.values (metadata_obj);
            let len          = metadata_obj.length < keys ? metadata_obj.length : keys.length;

            for (let c = 0; c < len; ++c)
            {
                let name       = keys[c];
                let name_lower = name.toLowerCase ();
                let value      = values[c];

                if (ARFSMETA_VAR_MAP[name_lower] != null)
                {
                    Sys.DEBUG ("ArFS: Key:" + name + " Value:" + value, txid)
                    file[ARFSMETA_VAR_MAP[name_lower]] = value;
                }
                else
                    Sys.WARN ("Unknown ArFS metadata field: " + name_lower, txid)

            }
                        
            
            if (Settings.IsDebug () )
            {
                Sys.DEBUG ("Metadata-TX processed:", txid);
                Sys.DEBUG (file);                                    
            }
            else if (Settings.IsVerbose () )
                Sys.VERBOSE (file.Filename + "(" + file.Size_ArFS + "B_ArFS, UT_T:" + file.Date_Tag + ")", txid);


            // Add the metadata to the virtual filesystem
            if (file.FileId != null)
                ardrive_fs.Files[file.FileId] = file;            

            else
                Sys.ERR ("Could not retrieve File-Id!", txid);

        }
    }
}


module.exports = { ListDriveFiles, DownloadFile };