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
const GQL      = require ('./GQL.js');



// Constants
const TAG_FILEID          = "File-Id";
const TAG_DRIVEID         = "Drive-Id";
const TAG_FOLDERID        = "Folder-Id";
const TAG_PARENTFOLDERID  = "Parent-Folder-Id";
const TAG_ENTITYTYPE      = "Entity-Type";
const TAG_CONTENTTYPE     = "Content-Type";
const ENTITYTYPE_FILE     = "file";
const ENTITYTYPE_FOLDER   = "folder";
const ENTITYTYPE_DRIVE    = "drive";

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
    "unix-time"         : "UNIXTime_TX",
    "arfs"              : "ArFSVersion",
    "entity-type"       : "ArFSEntityType",
    "user-agent"        : "UserAgent",
    "page:url"          : "PageURL",
    "page:title"        : "PageTitle",
    "page:timestamp"    : "PageUNIXTime",
}

const ARFSMETA_VAR_MAP =
{
    "name"              : "Filename",
    "size"              : "Size_ArFS",
    "lastmodifieddate"  : "UNIXTime_ArFS",
    "datatxid"          : "DataTXID",
    "datacontenttype"   : "ContentType_ArFS"
}







async function FindDriveOwner (drive_id)
{
    
    const query = GQL.CreateGQLTransactionQuery ( { "cursor" : undefined, 
                                                    "first"  : 1, 
                                                    "owner"  : undefined, 
                                                    "sort"   : GQL.SORT_OLDEST_FIRST ,
                                                    "tags"   :[ { name: TAG_DRIVEID,    values:drive_id },
                                                                { name: TAG_ENTITYTYPE, values:ENTITYTYPE_DRIVE } ], 
                                                } );
    Sys.DEBUG (query, "FindDriveOwner");


    const q = new GQL.SimpleTXQuery (query);    
    await q.Execute (Arweave);

    let entry = null;

    // Drive entry missing
    if (q.EntriesAmount <= 0)
        Sys.ERR ("Could not find a drive entity for drive " + drive_id);


    // Too many entries
    else if (q.EntriesAmount > 1)
    {
        Sys.ERR ("Multiple drive entities returned by GQL-query! Trying to sort manually.");
        Sys.DEBUG (q.Edges);

        let edges = q.Edges;
        let earliest_block = -1
	    let earliest_entry = null;

        for (let c = 0; c < amount; c++)
	    {		
		    if (earliest_block < 0 || edges[c].node.block.height < earliest_block)
            {
			    earliest_entry = edges[c];
			    earliest_block = earliest_entry.node.block.height;			
		   }
	   }
	   entry = earliest_entry;
    }

    // All good
    else
        entry = q.Edges[0];


    return entry != null ? entry.node.owner.address : undefined;
}





async function GetDriveARFSMetadataEntries (drive_id, entity_type)
{    
    const owner_address = await FindDriveOwner (drive_id);

    if (owner_address == undefined)
        Sys.ERR_OVERRIDABLE ("Drive owner address not known, might display malicious file entries. Use --force to proceed anyway.", "ArFS");  
    else
        Sys.VERBOSE ("Drive " + drive_id + " considered to belong to " + owner_address, "ArFS");



    const tags =                       [ {"name":"Drive-Id",    "values":drive_id}    ];
    if (entity_type != null) tags.push ( {"name":"Entity-Type", "values":entity_type} );

    txs = await Arweave.GetTXsForAddress (owner_address, tags);



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


async function ListDrives (address)
{
    
    const query = new GQL.SimpleTXQuery (Arweave);

    await query.Execute
    ( {         
        "cursor" : undefined,         
        "first"  : undefined,
        "owner"  : address, 
        "sort"   : GQL.SORT_NEWEST_FIRST ,
        "tags"   :[ { name: TAG_ENTITYTYPE, values:ENTITYTYPE_DRIVE } ], 
    } );
    
    Sys.INFO ("Entries: " + query.EntriesAmount);
    
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
        Sys.INFO (tx_amount + (tx_amount == 0 ? " entry" : " entries") + " found from drive " + drive_id + ".", "ArFS" );
        Sys.INFO ("Getting metadata for the files..", "ArFS");

        for (let C = 0; C < tx_amount; ++C)
        {       
            let tx = txs[C];
            let txid = tx.node.id;
            let prefix = "ArFS: " + txid;

            Sys.DEBUG ("--- Metadata transaction " + txid + " ---", "ArFS")
            
            let file =
            {                   
                "FileId"           : null,
                "DriveId"          : null,
                "ParentFolderId"   : null,
                "Filename"         : null,
                                
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
                Sys.DEBUG ("Tag: " + name + "=" + value, prefix); 

                file[name] = value;
                
                const name_lower = name.toLowerCase ();
                
                const varname = TXTAG_VAR_MAP[name_lower];
                if (varname != null)
                    file[varname] = value;

                else
                    Sys.WARN ("Unknown Arweave-tag: " + name, prefix);
                
            }    
            );


            // Check that the metadata is the expected format
            if (! METADATA_CONTENT_TYPES.includes (file.ContentType_TX.toLowerCase ()) )
            {
                // I had to disable this safety check because there was a bug in ArDrive's software
                // that made caused it to set Content-Type of the metadata TX to the MIME type
                // of the actual data instead of 'application/json'.
                /*
                Sys.ERR ("Unknown " + TAG_CONTENTTYPE + ": " + file.ContentType_TX, txid);
                if (!Settings.IsForceful () )
                    Sys.WARN ("Skipping this metadata.", txid);
                    continue;
                */                    
                Sys.WARN ("Transaction Content-Type is not 'application/json'", prefix);
            }



            // Check that the data-field of the metadata tx is of reasonable size.
            if (file.Metadata_Size > Settings.Config.MetaDataMaxSize)
            {
                Sys.ERR ("Unusually large data field: " + file.Metadata_Size + "B", prefix);
                if (!Settings.IsForceful () )
                {
                    Sys.WARN ("Skipping this metadata.", prefix);
                    continue;
                }

            }

            // Extract ArFS metadata JSON from the data of the metadata-tx:
            let metadata = await Arweave.GetTxStrData (txid);


            if (Settings.IsDebug () )
                Sys.DEBUG ("TX-data:" + metadata, prefix);
                

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
                    Sys.DEBUG ("ArFS: Key:" + name + " Value:" + value, prefix)
                    file[ARFSMETA_VAR_MAP[name_lower]] = value;
                }
                else
                    Sys.WARN ("Unknown ArFS metadata field: " + name_lower, prefix)

            }
                        
            
            if (Settings.IsDebug () )
            {
                Sys.DEBUG ("Metadata-TX processed:", prefix);
                Sys.DEBUG (file);                                    
            }
            else if (Settings.IsVerbose () )
                Sys.VERBOSE (file.Filename, prefix);


            // Add the metadata to the virtual filesystem
            if (file.FileId != null)
                ardrive_fs.Files[file.FileId] = file;            

            else
                Sys.ERR ("Could not retrieve File-Id!", prefix);

        }
    }
}


module.exports = { ListDrives, ListDriveFiles, DownloadFile };