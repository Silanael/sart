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

const METADATA_CONTENT_TYPES = ["application/json"]; Object.freeze (METADATA_CONTENT_TYPES);

const __TAG = "arfs";


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
}; Object.freeze (TXTAG_VAR_MAP);



const ARFSMETA_VAR_MAP =
{
    "name"              : "Filename",
    "size"              : "Size_ArFS",
    "lastmodifieddate"  : "UNIXTime_ArFS",
    "datatxid"          : "DataTXID",
    "datacontenttype"   : "ContentType_ArFS"
}; Object.freeze (ARFSMETA_VAR_MAP);



const URLMODES =
{
    "id"   : "id",
    "tx"   : "tx",
    "path" : "path",
}; Object.freeze (URLMODES);



class ArFSURL
{
        
    DriveID  = null;
    Mode     = null;
    Target   = null;

    Valid    = false;


    constructor (url = null)
    {
        if (url != null)
            this.Parse (url);
    }
    


    Parse (url)
    {   
        let url_no_proto;

        const proto_rest = url.split ("://", 2);            
        if (proto_rest.length == 2)
        {
            url_no_proto = proto_rest [1];            
            if (proto_rest[0].toLowerCase () != "arfs")
                return this.#Err ("Not an arfs:// URL: " + url);            
        }                
        else
            url_no_proto = proto_rest[0];


        // Split the string into segments separated by a '/'
        const segments = url_no_proto.split ("/");        
        
        // We want at least drive-id, mode and target.
        if (segments.length < 3)
            return this.#Err ("Invalid URL: " + url);

            
        const drive_id     = segments[0].toLowerCase ();
        const mode         = segments[1].toLowerCase ();
        

        // Verify Drive ID
        if (Util.IsArFSID (drive_id) )
            this.DriveID = drive_id;
        else
            return this.#Err ("Not a valid Drive ID: " + drive_id)                    


        // Verify mode
        if (URLMODES[mode] != null)
            this.Mode = mode;
        else
            return this.#Err ("Unknown mode in URL: " + mode);            

        

        // Grab target path from the original url after the "drive-id/mode/"-part.
        const target = url_no_proto.replace (/.+\/.+\//, "");        
        if (target == null || target.length <= 0)
            return this.#Err ("No target provided in URL.");


        // Finalize
        this.Path  = target;
        this.Valid = true;
        
        Sys.INFO (this);

        return this.Valid;
    }


    #Err (error)
    {
        Sys.ERR (error, __TAG);
        this.Valid = false;
        return false;       
    }

        
    static get MODE_ID   () { return URLMODES["id"];   }
    static get MODE_TX   () { return URLMODES["tx"];   }
    static get MODE_PATH () { return URLMODES["name"]; }

}





async function FindDriveOwner (drive_id)
{
    

    const q = new GQL.SimpleTXQuery (Arweave);
    await q.Execute
    ( { "cursor" : undefined, 
        "first"  : 1, 
        "owner"  : undefined, 
        "sort"   : GQL.SORT_OLDEST_FIRST ,
        "tags"   :[ { name: TAG_DRIVEID,    values:drive_id },
                    { name: TAG_ENTITYTYPE, values:ENTITYTYPE_DRIVE } ], 
    } );

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
    
    
    const now = Util.GetDate ();
    const drives = [];


    if (Settings.IsHTMLOut () )
    {
        const red        = "#900000";
        const red_dim    = "#700000";
        const black      = "#000000";
        const border     = "#B50000";
        const spacing_px = 5
        const padding_px = 5

        Sys.OUT_TXT ("<html>");
        Sys.OUT_TXT (`<head><title>List of ArDrive-drives - ${now}</title></head>`);
        Sys.OUT_TXT (`<body bgcolor='${black}' text='${red}' link='${red}' vlink='${red_dim}'>`);
        Sys.OUT_TXT ("<H1>ArDrive public drives</H1>");
        Sys.OUT_TXT (`<H3>${now} GMT+3</H3>`);

        Sys.OUT_TXT ("<H2>!!! WARNING !!!</H2>");
        Sys.OUT_TXT (`<p>`);        
        Sys.OUT_TXT (`This is an unfiltered, automatic index of user content in <a href="https://www.arweave.org/">the permaweb</a>.`);
        Sys.OUT_TXT (`<br>As such, <u>it may contain unwanted, shocking and even illegal content</u>.`);
        Sys.OUT_TXT (`<br>I cannot be held responsible for any traumas the weak-minded ones may receive from following the links here.`);
        Sys.OUT_TXT (`</p>`);

        Sys.OUT_TXT (`<p><u><b>BROWSE AT YOUR OWN RISK</b></u></p>`);
        

        Sys.OUT_TXT ("<div id='DriveList'>");
        Sys.OUT_TXT (`   <table border="1" bordercolor="${border}" cellspacing="${spacing_px}" cellpadding="${padding_px}">`);
        Sys.OUT_TXT (`      <tr>`);
        Sys.OUT_TXT (`          <th align="left" bgcolor="${red}"> <font color="${black}">#</font>        </th>`);
        Sys.OUT_TXT (`          <th align="left" bgcolor="${red}"> <font color="${black}">DRIVE ID</font> </th>`);
        Sys.OUT_TXT (`          <th align="left" bgcolor="${red}"> <font color="${black}">OWNER</font>    </th>`);        
        Sys.OUT_TXT (`          <th align="left" bgcolor="${red}"> <font color="${black}">NAME</font>     </th>`);        
        Sys.OUT_TXT ("      </tr>");
    }



    const len = query.EntriesAmount;
    for (let c = 0; c < len; ++c)
    {        
        const number      = len - c;
        const owner       = query.GetAddress (c);
        const txid        = query.GetTXID (c);
        const height      = query.GetBlockHeight (c);
        const tags        = query.GetTags (c);                 

        const has_arfs    = query.HasTag (c, "ArFS");
        const has_driveid = query.HasTag (c, "Drive-Id");
        const has_privacy = query.HasTag (c, "Drive-Privacy");


        if (!has_driveid)
        {
            Sys.WARN ("TX " + txid + " - Drive with no Drive ID. This should not happen.");
            if (Settings.IsHTMLOut () )
                Sys.OUT_TXT ("<!-- " + txid + " - Drive with missing DriveID. -->");
            
            continue;                                           
        }

        const drive_id   = query.GetTag (c, "Drive-Id");
        


        if (drives[drive_id] == undefined && has_arfs && has_driveid && has_privacy)
        {

            // Find real owner, going backwards from the end of the list
            let real_owner = owner;
            for (let b = len - 1; b > c; --b)
            {                
                if (query.GetTag (b, "Drive-Id") == drive_id && query.GetBlockHeight (b) < height)
                {
                    let old_real = real_owner;
                    real_owner = query.GetAddress (b);
                    Sys.DEBUG ("TX: " + txid + ": Real owner for drive " + drive_id + " updated to " + real_owner + ", was " + old_real);
                }
            }

            // Owner mismatch
            if (real_owner != owner)
            {
                Sys.ERR ("TX " + txid + ": Entry for drive " + drive_id + " found from address:" + owner + " when it really belongs to " + real_owner + ".");
                Sys.ERR ("TX " + txid + ": A possible drive collision attack!");
                if (Settings.IsHTMLOut () )
                    Sys.OUT_TXT ("<!-- " + txid + " - Drive-Id collision with " + drive_id + " (real owner: " + real_owner + ") - possible attack -->");
    
                continue;
            }


            drives[drive_id] = true;
            
            const drive_privacy  = tags.find (e => e.name == "Drive-Privacy").value;
            const arfs_version   = tags.find (e => e.name == "ArFS").value;            
            const __tag          = "ArFS: " + drive_id;         
            
            
            if (Settings.IsHTMLOut () )
            {
                
                // Public drive
                if (drive_privacy == "public")
                {
                    Sys.VERBOSE ("Fetching metadata from TX " + txid + " ...", __tag);                    
                    const data           = await Arweave.GetTxStrData (txid);

                    const drive_metadata = JSON.parse (data);
                    const drive_name     = drive_metadata.name != null && drive_metadata.name.length > 0 ? drive_metadata.name : "???";
                    const link           = `https://app.ardrive.io/#/drives/${drive_id}`;
                                        
                    Sys.OUT_TXT ("      <tr>"
                                +`<th align="left">${number}</th>`
                                +`<th align="left"><a href="${link}" style="text-decoration:none">${drive_id}</a></th>`
                                +`<th align="left">${owner}</th>`
                                +`<th align="left"><a href="${link}" style="text-decoration:none">${drive_name}</a></th>`                                
                                + "</tr>");
                }
          
                // Private drive, just make a note of it.
                else if (drive_privacy == "private")
                    Sys.OUT_TXT (`      <!-- Private drive: ${drive_id} -->`);

                else
                {
                    Sys.WARN ("Unknown Drive-Privacy for drive " + drive_id + ": " + drive_privacy);
                    Sys.OUT_TXT (`      <!-- Drive with unknown Drive-Privacy '${drive_privacy}': ${drive_id} -->`);
                }
            }

            else            
                Sys.OUT_TXT (drive_id + " " + query.GetTXID (c) + " " + drive_privacy);
        }

        else if (drives[drive_id] != undefined)
        {
            Sys.WARN ("TX " + txid + " - Old metadata for drive " + drive_id);
            if (Settings.IsHTMLOut () )
                Sys.OUT_TXT ("      <!-- Old metadata for drive:" + drive_id + ": " + txid + " -->");                                           
        }

        else
        {
            Sys.WARN ("TX " + txid + " - Drive with missing tags.");
            if (Settings.IsHTMLOut () )
                Sys.OUT_TXT ("      <!-- " + txid + " - Drive with missing tags: DriveID:" + has_driveid + " Drive-Privacy:" 
                                           + has_privacy + " ArFS:" + has_arfs + " -->");
        }
    }
     
    if (Settings.IsHTMLOut () )
    {
        Sys.OUT_TXT ("   </table>");        
        Sys.OUT_TXT ("</div>");
        Sys.OUT_TXT (`<br>&copy <a href="http://www.silanael.com">Silanael</a> 2021-10-21_01`);
        Sys.OUT_TXT ("</body>");
        Sys.OUT_TXT ("</html>");
        Sys.OUT_TXT ("<!-- Page created on " + now + " with SART v" + Util.GetVersion () + " -->" );
        Sys.OUT_TXT ("<!-- (C) Silanael 2021 - www.silanael.com / zPZe0p1Or5Kc0d7YhpT5kBC-JUPcDzUPJeMz2FdFiy4-->");        
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


module.exports = { ArFSURL, ListDrives, ListDriveFiles, DownloadFile };