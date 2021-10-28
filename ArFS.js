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
const TAG_DRIVEPRIVACY    = "Drive-Privacy";
const TAG_ENTITYTYPE      = "Entity-Type";
const TAG_CONTENTTYPE     = "Content-Type";
const TAG_UNIXTIME        = "Unix-Time";
const ENTITYTYPE_FILE     = "file";
const ENTITYTYPE_FOLDER   = "folder";
const ENTITYTYPE_DRIVE    = "drive";

const ARFSENTITYMETA_NAME         = "name";
const ARFSENTITYMETA_ROOTFOLDERID = "rootFolderId";
const ARFSENTITYMETA_DATATXID     = "dataTxId";

const ARFSDRIVEPRIVACY_PUBLIC  = "public";
const ARFSDRIVEPRIVACY_PRIVATE = "private";

const ENTITYTYPE_IDTAG_MAP =
{
    [ENTITYTYPE_DRIVE]  : TAG_DRIVEID,
    [ENTITYTYPE_FILE]   : TAG_FILEID,
    [ENTITYTYPE_FOLDER] : TAG_FOLDERID

}; Object.freeze (ENTITYTYPE_IDTAG_MAP);

const METADATA_CONTENT_TYPES = ["application/json"];                                    Object.freeze (METADATA_CONTENT_TYPES);
const ARFS_ENTITY_TYPES      = [ENTITYTYPE_DRIVE, ENTITYTYPE_FILE, ENTITYTYPE_FOLDER];  Object.freeze (ARFS_ENTITY_TYPES);
const ENTITYTYPES_INFOLDER   = [ENTITYTYPE_FILE, ENTITYTYPE_FOLDER]; // Things that may be contained by folders.

const ENTITYSYMBOLS          = { [ENTITYTYPE_DRIVE] : 'D', [ENTITYTYPE_FOLDER] : 'd', [ENTITYTYPE_FILE] : '-'}

function IsValidEntityType     (entity_type) { return ARFS_ENTITY_TYPES.includes (entity_type?.toLowerCase () );  }
function GetIDTag              (entity_type) { return ENTITYTYPE_IDTAG_MAP[entity_type]; }
function GetEntitySymbol       (entity_type) { const s = ENTITYSYMBOLS[entity_type]; return s != null ? s : '?'; }
function IsFile                (entity_type) { return entity_type == ENTITYTYPE_FILE;   }
function IsFolder              (entity_type) { return entity_type == ENTITYTYPE_FOLDER; }
function IsDrive               (entity_type) { return entity_type == ENTITYTYPE_DRIVE;  }


const __TAG = "arfs";




// This maps the lowercase-versions of the TX metadata-tags
// as well as ArFS to class/object variable names.
// Could have just done file[tagname] = tagvalue, but
// wanted to at least try to keep things more tidy.
const TXTAG_VAR_MAP =
{    
    "file-id"           : "FileId",
    "drive-id"          : "DriveId",
    "drive-privacy"     : "DrivePrivacy",     
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
    "id"    : "id",
    "tx"    : "tx",
    "path"  : "path",
    "drive" : "drive",    
}; Object.freeze (URLMODES);










class ArFSURL
{     
    DriveID  = null;
    Mode     = null;
    Target   = null;
    Path     = null;

    Valid    = false;

    
    constructor (url = null)
    {
        if (url != null)
            this.Parse (url);
    }
    

    IsValid      () { return this.Valid;                                                                 } 
    IsFullDrive  () { return this.Mode == URLMODES["drive"];                                             }
    IsRootFolder () { return this.Mode == URLMODES["path"] && (this.Target == "/" || this.Target == ""); }
    IsPath       () { return this.Mode == URLMODES["path"] &&  this.Target != "/" && this.Target != "";  }


    Parse (url)
    {   
        this.Valid = false;

        let url_with_proto;
        let url_no_proto;
        
        const proto_rest = url.split ("://", 2);            
        if (proto_rest.length == 2)
        {
            url_with_proto = url;
            url_no_proto   = proto_rest[1];
                 
            if (proto_rest[0].toLowerCase () != "arfs")
                return this.#Err ("Not an arfs:// URL: " + url);            
        }                
        else
        {
            url_with_proto = "arfs://" + url;
            url_no_proto   = url;
        }
        

        // Split the string into segments separated by a '/'
        const segments = url_no_proto.split ("/");        
        

        // We want at least drive-id, mode and target.
        if (segments.length < 1)
            return this.#Err ("Invalid URL: " + url);



        // Verify Drive ID
        const drive_id  = segments[0].toLowerCase ();    

        if (Util.IsArFSID (drive_id) )
            this.DriveID = drive_id;
        else
            return this.#Err ("Not a valid Drive ID: " + drive_id)                    
        

        // Only Drive ID is present in the URL.
        // Assume users wants entire drive content.
        if (segments.length == 1)
        {
            this.Mode   = URLMODES["drive"];
            this.Target = "";
            this.Valid  = true;            
        }
        
        // We got a trailing slash but nothing after.
        // Assume user wants the content of the root directory.
        else if (segments.length == 2 && segments[1] == "")
        {
            this.Mode   = URLMODES["path"];
            this.Target = "/";
            this.Valid  = true;            
        }
        
        
        // Mode present
        else
        {
            // Verify mode
            const mode = segments[1].toLowerCase ();
            if (URLMODES[mode] != null)
                this.Mode = mode;
            else
                return this.#Err ("Unknown mode in URL: " + mode);            

        

            // Grab target path from the original url after the "drive-id/mode/"-part.
            const target = url_with_proto.split (/arfs:\/\/[^\/]+\/[^\/]+\//);


            // Verify grab
            if (target == null || target.length < 2)
                return this.#Err ("No target provided in URL.");


            // Finalize
            this.Target = target[1];
            this.Valid  = true;
        }


        this.Path = this.Target.split ("/");


        
        return this.Valid;
    }


    #Err (error)
    {
        Sys.ERR (error, __TAG);
        this.Valid = false;
        return false;       
    }

        

}











class ArFSEntity
{    
    ArFSID           = null;
    ArFSName         = null;
    ArFSEntityType   = null;
            
    OwnerAddress     = null;

    MetaTXID_Latest  = null;
    Metadata_Latest  = null;
    MetaBlock_latest = null;

    UNIXTime_MetaTX  = null;

    BlockHeight      = 0;
    BlockTimestamp   = 0;

    Valid            = true;



    // Overridables
    //
           _OnARFSMetadataSet ()                  { Sys.ERR ("OnARFSMetadataSet not properly overridden!", __TAG); return false; }
           _RemoveEntity      (arfs_entity)       { } 
    async  _OnUpdate          ()                  { }
     



    static CREATE (arfs_id = null, entity_type = null, master = null, gql_entry = null)
    {

        if (gql_entry != null)
        {
            this.BlockHeight    = gql_entry.GetBlockHeight ();
            this.BlockTimestamp = gql_entry.GetBlockTime ();
            entity_type         = gql_entry.GetTag (TAG_ENTITYTYPE);
        }
        

        switch (entity_type)
        {
            case ENTITYTYPE_FILE:
                return new ArFSFile (arfs_id, master, gql_entry);

            case ENTITYTYPE_FOLDER:
                return new ArFSDir (arfs_id, master, gql_entry);

            case ENTITYTYPE_DRIVE:
                return new ArFSDrive (arfs_id, master, gql_entry);

            case null:
                Sys.ERR ("CREATE: Entity type not set!");
                return null;

            default:
                Sys.ERR ("CREATE: Unknown entity type " + entity_type);
                return null;
        }            
    }




    constructor (arfs_id, entity_type, master = null, gql_entry= null)
    {
        
        // Setup using the result from a GQL-query
        if (gql_entry != null)
        {
            this.ArFSEntityType   = gql_entry.GetTag (TAG_ENTITYTYPE);
            this.ArFSID           = gql_entry.GetTag (GetIDTag (this.ArFSEntityType) );
            this.MetaBlock_latest = gql_entry.Block;
        }

        else
        {
            this.ArFSEntityType   = entity_type;
            this.ArFSID           = arfs_id;
        }


        // Validate Entity-Type
        if (!IsValidEntityType (this.ArFSEntityType) )
            return this._SetInvalid ("Unknown entity type " + this.ArFSEntityType);


        // Validate ID
        if (!Util.IsArFSID (this.ArFSID) )
            return this._SetInvalid ("Invalid ID for entity '" + this.ArFSEntityType + "': " + this.ArFSID);
        
      
    }





    
    GetIDTag             ()       { return GetIDTag (this.ArFSEntityType);                                                }
    IsContainedIn        (entity) { return this.ParentFolderId != null && this.ParentFolderId == entity.ArFSID            }
    IsFile               ()       { return this.ArFSEntityType == ENTITYTYPE_FILE;                                        }
    IsFolder             ()       { return this.ArFSEntityType == ENTITYTYPE_FOLDER;                                      }
    IsDrive              ()       { return this.ArFSEntityType == ENTITYTYPE_DRIVE;                                       }
    GetID                ()       { return this.ArFSID;                                                                   }    
    GetName              ()       { return this.ArFSName;                                                                 }
    GetDisplayName       ()       { return this.ArFSName != null && this.ArFSName != "" ? this.ArFSName : "<UNNAMED>";    }
    GetNameAndID         ()       { return this.GetDisplayName () + " (" + this.ArFSID + ")";                             }
    GetIDAndName         ()       { return this.ArFSID + " (" + this.GetDisplayName () + ")";                             }
    HasTargetName        (name)   { return this.ArFSName != null && this.ArFSName.toLowerCase () == name?.toLowerCase (); }    
    HasTargetNameRegex   (regex)  { return this.ArFSName != null && this.ArFSName.toLowerCase ().match (regex) != null;   }    
    HasTargetNameWildCard(name_w ){ return Util.StrCmp_Wildcard (name_w, this.ArFSName);                                  }    
    IsNewerThan          (entity) { return entity == null || entity.BlockTimestamp > this.BlockTimestamp;                 }
    IsNewerThanTimestamp (time)   { return time > this.BlockTimestamp;                                                    }


    Matches (requirements = {name: null, entity_type: null, arfs_id: null} )
    {        
        //if (requirements.name != null)

    }

    
    GetPathNameToRoot ()
    {    
        let pathstr = "/" + this.GetName ();

        if (this.IsRootFolder)
            return pathstr;

        let master       = this.MasterEntity;        
        
        while (master != null && master.IsFolder () && !master.IsRootFolder)
        {       
            pathstr = "/" + master.GetName () + pathstr;
            master = master.MasterEntity;
        }

        return pathstr;
    }

    
    async Update ()
    { 
        Sys.DEBUG ("Updating ", this.ArFSID);
        
        await this._UpdateMetadata ();
        await this._OnUpdate ();
    }


 

    async GetOwner ()
    {
        if (this.OwnerAddress != null && this.OwnerAddress != "")
        {
            Sys.DEBUG ("GetOwner: Owner address already set.", this.ArFSID);
            return this.OwnerAddress;
        }

        else if (this.MasterEntity != null && this.MasterEntity.OwnerAddress != null)
        {
            Sys.DEBUG ("GetOwner: Using owner address of Master " + this.MasterEntity.ArFSID + ".", this.ArFSID);
            return this.MasterEntity.OwnerAddress;
        }

        else
        {
            await this._FetchOwner ();
            return this.OwnerAddress;
        }
    }

  
    // Find the earliest metadata entry of the Drive ID and stores its owner.
    async _FetchOwner ()
    {        
        Sys.DEBUG ("Fetching owner for " + this.ArFSEntityType + " " + this.ArFSID + " ...");

        const id_tag = this.GetIDTag ();
        
        if (id_tag == null)
            return this._SetInvalid ("Could not get transaction tag for entity type '" + this.ArFSEntityType + "'", "UpdateMetaData");

        
        const query = new GQL.TXQuery (Arweave);
        await query.Execute
        ({
            first: 1, 
            sort: GQL.SORT_OLDEST_FIRST,
            tags: 
            [ 
                { name:id_tag,        values:this.ArFSID         },
                { name:"Entity-Type", values:this.ArFSEntityType } 
            ]
        });

        this.OwnerAddress = query.GetAddress (0);
        Sys.VERBOSE ("Owner set to " + this.OwnerAddress, this.ArFSID);            


        return this.OwnerAddress;
    }



  
    // Fetch the latest metadata for the entity.
    async _UpdateMetadata ()
    {        

        // Make sure we have owner. Will fetch if need be.
        const entity_owner = await this.GetOwner ();
    
        if (entity_owner == null || entity_owner == "")
            return this._SetInvalid ("Could not determine owner.", "_UpdateMetaData");
        

        // Arweave transaction tag ("File-Id" etc.)
        const id_tag = this.GetIDTag ();
        
        if (id_tag == null)
            return Sys.ERR ("Could not get transaction tag for entity type '" + this.ArFSEntityType + "'", "_UpdateMetaData");
        


        // Create a query
        const queryconfig = 
        {
            first: 1, 
            sort: GQL.SORT_NEWEST_FIRST,
            owner: entity_owner,
            tags: 
            [ 
                { name:id_tag,     values:this.ArFSID         },
                { name:TAG_ENTITYTYPE, values:this.ArFSEntityType } 
            ]            
        };
    

        
        // Seek for the newest metadata TX for the entity
        const query = new GQL.TXQuery (Arweave);
        await query.ExecuteReqOwner (queryconfig);
   
        
        // We should only be getting one entry.
        const entry = query.GetEntry (0);
        

        
        if (entry != null && Util.IsArweaveHash (entry.TXID) )
        {
            Sys.VERBOSE ("Fetched the newest metadata: TXID " + entry.TXID);

            const new_blockheight = entry.GetBlockHeight ();
            const new_timestamp   = entry.GetBlockTime   ();

            if (this.BlockHeight > new_blockheight || this.BlockTimestamp > new_timestamp)
            {
                Sys.ERR ("Fetch for newest metadata (TXID: " + entry.TXID + ")" 
                         + " resulted entry with lower block height or timestamp " 
                         + " (Current height:" + this.BlockHeight + ", timestamp:" + this.BlockTimestamp + ")."
                         + " Keeping the old entry.");

                return this.Valid;
            }

            this.MetaTXID_Latest  = entry.TXID;
            this.MetaBlock_latest = entry.Block;
            this.UNIXTime_MetaTX  = entry.GetTag (TAG_UNIXTIME);
            

            const old_parent = this.ArFSParentID;
            const new_parent = entry.GetTag (TAG_PARENTFOLDERID);
            
            if (new_parent != old_parent)
            {
                this.ParentFolderId = new_parent;

                if (old_parent == null)
                    Sys.DEBUG ("Parent folder set to " + new_parent, this.ArFSID);

                else
                {
                    Sys.VERBOSE ("Parent folder changed from " + old_parent + " to " + new_parent + " (move operation)");
                    this.#OnEntityMoved (new_parent);
                }
            }
            
        }
        else
            return this._SetInvalid ("Failed to fetch newest metadata.");
        
        
        // Get ArFS entity metadata from the transaction data
        const metadata = await GetMetaTXJSON (this.MetaTXID_Latest);


        // Parse ArFS entity metadata
        if (metadata != null)
        {
            this.ArFSName        = metadata[ARFSENTITYMETA_NAME];
            this.Metadata_Latest = metadata;        
            
            this.Valid = await this._OnARFSMetadataSet (entry, metadata);
        
            Sys.VERBOSE ("Metadata parsed for entity " + this.ArFSID, ArFSEntity.name);
            Sys.DEBUG (this.Metadata_Latest);
        }
        else        
            this.Valid = false;                    

        return this.Valid;
    }



    #OnEntityMoved (new_parent_id)
    {
        if (this.MasterEntity != null)
        {
            this.MasterEntity._RemoveEntity (this);
            this.MasterEntity = null;
        }
    }


   

    // For output.
    GetFlagStr ()
    {
        const d = GetEntitySymbol (this.ArFSEntityType); // f = file, d = dir, D = drive
        const p = '-'; // p = private, - = public
        const l = '-'; // - = local, e = data on another drive, E = metadata on another drive, ! = both on another drive
        const r = 'r'; // Read
        const w = '-'; // Write
        const s = '-'; // Status: V = verified,     - = unchecked,    o = orphaned, 
                       //         M = meta missing, D = data missing, C = collision, ! = multiple errors        
        return d+p+l+r+w+s;
    }


    GetListStr ()
    {
        return this.ArFSID + " " + this.GetFlagStr () + " " + this.GetPathNameToRoot ();
    }


    // A convenience setter function.
    #SetOrFail (variable, value, err_on_fail)
    {
        if (value != null)
        {
            this[variable] = value;
            return true;
        }

        else
        {
            Sys.ERR (err_on_fail, ArFSDrive.name);
            this.Valid = false;
            return false;
        }
    }


    // Mark the entity as invalid
    _SetInvalid (error, src)
    {
        Sys.ERR (error, "ArFS: " + this.ArFSID + (src != null ? ": " + src : "") );
        this.Valid = false;
        return false;       
    }

};






class ArFSItem extends ArFSEntity
{
    OwnerDrive       = null;
    MasterEntity     = null;
    ArFSParentID     = null;


    constructor (arfs_id, entity_type, master = null, gql_entry = null)
    {
        super (arfs_id, entity_type, master, gql_entry);

        // Set ownership 
        if (master != null)
            this._SetMaster (master);

        if (this.OwnerDrive == null)
            Sys.ERR (this.GetNameAndID () + " doesn't have a drive.");
    }

   
    _SetMaster (master)
    {
        if (this.MasterEntity != master)
        {
            if (this.MasterEntity != null)
                this.MasterEntity._RemoveEntity (this);

            this.MasterEntity   = master;
            this.ParentFolderId = master?.ArFSID;

            this.OwnerDrive = master.IsDrive () ? master : master.OwnerDrive;
            
            if (this.OwnerDrive != null)
                this.OwnerDrive.AddEntity (this);        
            
        }
    }    

}










class ArFSDrive extends ArFSEntity
{  

    RootFolderID    = null;    
    RootFolder      = null;
    IsPrivateDrive  = false;

    Files           = {};
    Folders         = {};
    Orphaned        = [];


    constructor (arfs_id, master = null, gql_entry = null)
    {
        super (arfs_id, ENTITYTYPE_DRIVE, master, gql_entry);
    }
 

    AddEntity (entity)
    {
        const ref = this._GetListFor (entity);
        const id  = entity.GetID ();
        
        if (ref == null)
            Sys.ERR ("Unable to add " + entity.GetNameAndID () + " into " + this.GetNameAndID () + ".");

        else if (ref[id] != null)
            //Sys.ERR (this.GetNameAndID () + " already contains " + ref[id].GetNameAndID () + ", tried to add " + entity.GetNameAndID() );
            Sys.VERBOSE (this.GetNameAndID () + " already contains " + ref[id].GetNameAndID () + ", replaced with " + entity.GetNameAndID() );

        
        ref[id] = entity;
        entity.OwnerDrive = this;

        Sys.VERBOSE ("Added " + entity.GetNameAndID () + " into drive " + this.GetNameAndID () + " (" + ref.name + ").");            
        
        
    }
 
    ContainsID      (id)          { return this.Folders[id] != null || this.Files[id] != null; }    
    _GetListFor     (entity)      { return entity.IsFile ()     ? this.Files : entity.IsFolder ()     ? this.Folders : null; }
    _GetListForType (entity_type) { return IsFile (entity_type) ? this.Files : IsFolder (entity_type) ? this.Folders : null; }

    GetEntityByID (id)
    {
        const file = this.Files[id];
        return file != null ? file : this.Folders[id];        
    }


    /* Override */async _OnARFSMetadataSet (entry, metadata)
    {       
        if (!entry.HasTag (TAG_DRIVEPRIVACY))
        {
            this._SetInvalid ("Drive " + this.GetNameAndID () + " has no " + TAG_DRIVEPRIVACY + " ..");
            return false;
        }
        else
        {
            this.IsPrivateDrive = Util.StrCmp (entry.GetTag (TAG_DRIVEPRIVACY), ARFSDRIVEPRIVACY_PRIVATE);            
            Sys.VERBOSE ("Drive " + this.GetNameAndID () + " is " + (this.IsPrivateDrive ? "private" : "public") );
        }
        
        const new_rootfolder = metadata[ARFSENTITYMETA_ROOTFOLDERID];

        // Root folder changed or first time receiving
        if (this.RootFolderID != new_rootfolder)
        {
            if (this.RootFolderID != null)
                Sys.WARN ("Root folder for drive " + this.DriveID + " changed from " + this.RootFolderID 
                                                                          + " to "   + new_rootfolder, ArFSDrive.name);
            this.RootFolderID                = new_rootfolder;                
            this.RootFolder                  = new ArFSDir (this.RootFolderID, this);
            this.RootFolder.IsRootFolder     = true;            
            
            this.Valid                       = this.RootFolder.Valid;
        }
        
        if (this.ArFSName == null || this.ArFSName == "")                
            Sys.WARN ("Drive " + this.ArFSID + " has no name.");        
                                    
        return true;
    }


    async List (arfs_url)
    {

        // See that the URL is good
        if (!arfs_url.Valid)
        {
            Sys.ERR ("Invalid URL " + arfs_url, this.DriveID);
            return false;
        }

        else if (arfs_url.DriveID != this.ArFSID)
        {
            Sys.ERR ("Drive " + this.ArFSID + " requested to fetch path pointing to drive " + arfs_url.DriveID);
            return false;
        }


        let success = false;;

        // Update the directory metadata and is content        
        await this.Update ();
        

        // Root folder missing, cannot list
        if (this.RootFolder == null)
        {
            Sys.ERR ("Unable to fetch root folder for drive " + this.ArFSID + "!");
            return false;
        }


        // Full drive listing
        if (arfs_url.IsFullDrive () )
        {
            Sys.VERBOSE ("Listing full drive " + this.ArFSID + ":");
            await this.RootFolder.List ( { recursive: true} );

            if (Settings.Config.DisplayAll)
            {
                Sys.VERBOSE ("Seeking for orphaned files..");
                const query = new GQL.TXQuery (Arweave);
        
                await query.ExecuteReqOwner
                ({
                    owner: this.OwnerAddress,
                    tags:
                    [
                        { name: "Drive-Id",    values:this.GetID ()        },
                        { name: "Entity-Type", values:ENTITYTYPES_INFOLDER },
                    ]
                });
        
                const entries = query.GetEntriesAmount ();
                for (let C = 0; C < entries; ++C)
                {
                    const entry       = query.GetEntry (C);
                    const entity_type = entry.GetTag (TAG_ENTITYTYPE);
                    const ID          = entry.GetTag (GetIDTag (entity_type) );
                    const parentid    = entry.GetTag (TAG_PARENTFOLDERID)
                    
                    // Root folder has no TAG_PARENTFOLDERID.
                    if (parentid != null && this.Folders[parentid] == null)
                        Sys.ERR ("Orphaned item found: " + ID + " TXID:" + entry.GetTXID () + " - says to be in " + parentid);                
                            
                }
                                            
            }

        }
        
        // List root folder only
        else if (arfs_url.IsRootFolder () )
        {                    
            Sys.VERBOSE ("Listing root folder of drive " + this.ArFSID + ":");
            success = await this.RootFolder.List ( {recursive: Settings.Config.Recursive} );
        }
                
        // Path listing
        else if (arfs_url.IsPath () )
        {   

            Sys.VERBOSE ("Locating target: " + arfs_url.Target);
            const dir = await this.RootFolder.GetDirByURL (arfs_url, 0);

            if (dir != null)
                await dir.List ( {recursive: Settings.Config.Recursive} );
        }
        
        else
            Sys.ERR ("Unknown path mode " + arfs_url.Mode);


        return success;
    }


  

}













class ArFSDir extends ArFSItem
{   

    Entities        = {};

    FilesAmount     = 0;
    DirAmount       = 0;
    EntitiesAmount  = 0;

    IsRootFolder    = false;


    constructor (arfs_id, master = null, gql_entry = null )
    {
        super (arfs_id, ENTITYTYPE_FOLDER, master, gql_entry);  
    }


    /* Override */ async _OnARFSMetadataSet (entry, metadata)
    {        
        return true;
    }


    /* Override */ _RemoveEntity (entity)
    {
        if (entity != null && Files[entity.ArFSID] != null)
        {
            Files[entity.ArFSID] = null;
            entity.MasterEntity = null;
            Sys.VERBOSE ("Removed " + entity.ArFSID + " from contained entities.");
        }
    }


    /* Override */ async _OnUpdate ()
    {       
        const owner_addr = await this.GetOwner ();

        Sys.VERBOSE ("Fetching directory content.. ", this.ArFSID);
        
        // Seek for the entities on the owner address that are contained
        // within this directory.
        const query = new GQL.TXQuery (Arweave);
        await query.ExecuteReqOwner
        ({         
            sort:  GQL.SORT_NEWEST_FIRST,
            owner: owner_addr,
            tags: 
            [ 
                { name:"Parent-Folder-Id", values:this.ArFSID           },
                { name:"Entity-Type",      values:ENTITYTYPES_INFOLDER  },                
            ]
        });

        
        const len = query.GetEntriesAmount ();
        let processed = 0;
        
        Sys.VERBOSE ("Processing " + len + " entries...", this.ArFSID);

        for (let C = 0; C < len; ++C)
        {                 
            const entry = query.GetEntry (C);

            const type  = entry.GetTag       (TAG_ENTITYTYPE);
            const id    = entry.GetTag       (GetIDTag (type));
            const btime = entry.GetBlockTime ();
            
            if (this.OwnerDrive != null && this.OwnerDrive.GetEntityByID (id)?.IsNewerThanTimestamp (btime) )
            {
                Sys.VERBOSE ("Encountered an old transaction for " + id + " (TXID:" + entry.GetTXID () + ") - ignoring.");
                continue;
            }

            const new_entity = ArFSEntity.CREATE (null, null, this, entry);
            
            // Failed to create.
            if (new_entity == null)
            {
                Sys.ERR ("Invalid entry encountered.");
                continue; 
            }

            this.Entities[new_entity.ArFSID] = new_entity;
            ++processed;        
        }
        
        Sys.VERBOSE (processed + " / " + len + " entries added." + this.ArFSID);
    }


    async UpdateContainedEntities (args = { recursive : false, list : false }, folderids_visited = {} )
    {        
        const values = Object.values (this.Entities);
        const amount = values.length;

        this.FilesAmount     = 0;
        this.DirAmount       = 0;
        this.EntitiesAmount  = 0;

        if (this.ArFSID != null)
            folderids_visited[this.ArFSID] = this;
        else
            Sys.ERR ("ID not set for a folder.");

    
        for (let C = 0; C < amount; ++C)
        {
            let entity = values[C];
            await entity.Update ();

            // The entity has moved away from this directory.
            if (!entity.IsContainedIn (this) )
            {
                delete this.Entities[entity.ArFSID];
                Sys.VERBOSE ("Removed " + entity + " from " + this.name + " as it was moved.");
            }

            // A valid entity
            else
            {
                ++this.EntitiesAmount;
                const is_dir = entity.IsFolder ();
                
                if (args.list)
                    Sys.OUT_TXT (entity.GetListStr () );

                if (is_dir)
                {
                    ++this.DirAmount;

                    if (args.recursive)
                    {
                        if (folderids_visited[entity.ArFSID] == null)
                            await entity.UpdateContainedEntities (args);

                        // A folder entry points to an already visited folder, ignore it.
                        else
                        {
                            Sys.WARN    ("Entity " + entity.GetNameAndID () + " points to an already visited directory - ignoring.");
                            Sys.VERBOSE ("Already visited " + folderids_visited[entity.ArFSID]?.GetNameAndID () + 
                                         ", entry " + entity.GetNameAndID + " points to it in " + this.GetNameAndID () + " ."  );
                        }
                    }
                }

                else if (entity.IsFile () )
                    ++this.FilesAmount;
                
            }
        }
    }




    async List ( args = { recursive : false, list : true} )
    {
        args.list = true;

        await this.Update ();

        Sys.INFO ("Listing content of '" + this.ArFSName + "' (" + this.ArFSID + "):");
        Sys.INFO ("");

        await this.UpdateContainedEntities (args);
        
        Sys.INFO ("");
        Sys.INFO (this.EntitiesAmount + " entries (" + this.FilesAmount + " files, " + this.DirAmount + " folders)");
    }



    GetContainedEntity (name, opts = { allow_wildcards: Settings.Config.AllowWildcards, entity_type: null } )
    {
        // TODO: Make a name-entity lookup table
        const values = Object.values (this.Entities);
        const len = values.length;
        for (let C = 0; C < len; ++C)
        {
            let entity = values[C];
            if (entity.Matches ( { "name":name, entity_type:opts.entity_type } ) );
                return entity;
        }

        return null;
    }




    // A recursive function that travels along the path of the URL,
    // updating directory content as it goes.
    async GetDirByURL (arfs_url, index)
    {
        await this.Update ();
        await this.UpdateContainedEntities (false);

        const name = arfs_url.Path[index];

        if (name == null || name == "")
        {
            Sys.VERBOSE ("GetDirByURL: No path provided (" + arfs_url.Path + ") - using this folder (" + this.name + ").");
            return this;
        }

        Sys.VERBOSE ("Searching for " + name + " from " + this.name + " (" + this.ArFSID + ") - step " + index + " ...");

        // Fetch the next directory in the path
        let dir = this.GetDirByName (name);

        if (dir != null)
        {
            if (index >= arfs_url.Path.length - 1)
                return dir;

            else            
                dir = await dir.GetDirByURL (arfs_url, index + 1);
        }
        
        if (dir != null)
            Sys.VERBOSE ("Directory " + arfs_url.Path + " located: " + dir.ArFSID);

        else
            Sys.ERR ("Failed to locate directory " + arfs_url.Path);

        return dir;
    }


    GetDirByName (name)
    {
        // TODO: Make a name-entity lookup table
        const values = Object.values (this.Entities);
        const len = values.length;
        for (let C = 0; C < len; ++C)
        {
            let entity = values[C];
            if (entity.IsFolder () && entity.HasTargetName (name) )
                return entity;
        }

        return null;
    }

}





















class ArFSFile extends ArFSItem
{     
    FileSize_Actual_B      = null;
    FileSize_Claimed_B     = null; // ArFS entity metadata (.json)

    FileUNIXTime_Claimed   = null; // ArFS entity metadata (.json)
    FileUNIXTime_DataTX    = null;
    FileUNIXTime_MetaTX    = null;

    FileContentType        = null; // MIME type
    
    DataTXID               = null;


    constructor (arfs_id, master = null, gql_entry= null, data_txid)
    {
        super (arfs_id, ENTITYTYPE_FILE, master, gql_entry)
        this.DataTXID = data_txid;        
    }

    /* Override */ async _OnARFSMetadataSet (entry, metadata)
    { 
        const data_txid = metadata[ARFSENTITYMETA_DATATXID];

        if (data_txid != null)
        {
            this.DataTXID = data_txid;
            Sys.VERBOSE (this.GetNameAndID () + ": Data TX ID set to " + data_txid + " .");
        }
        else
        {
            Sys.ERR ("Metadata didn't contain Data TX ID for " + this.GetNameAndID () + " !");
            return false;
        }

        return true;
    }

    async Download ()
    {
        if (this.OwnerAddress == null)
            Sys.ERR ("Download: No owner address set for " + this.GetNameAndID () + " !" );

        else if (this.DataTXID != null)
        {
            Sys.WARN ("Downloading file " + this.GetIDAndName () + " from data TX: " + this.DataTXID + " on address: " + this.OwnerAddress + " ...");
            const data = await Arweave.GetTxData (this.DataTXID); 

            Sys.OUT_BIN (data);
        }
        else
            Sys.ERR ("No Data TX set for " + this.GetNameAndID () + " !");
    }

}















// Gets and parses the ArFS metadata from the metadata TX data.
// Should be in JSON-format. A bug in the old ArDrive software
// caused these to be the wrong Content-Type so not checking for that.
async function GetMetaTXJSON (txid)
{

    const data = await Arweave.GetTxStrData (txid);

    if (data != null)
    {
        try
        {
            const  parsed = JSON.parse (data);
            return parsed;
        }
        catch (exception)
        {
            Sys.ERR ("Metadata for TXID " + txid + " failed to parse into JSON.", __TAG);
            Sys.DEBUG (exception);
        }
    }
    else
        Sys.ERR ("Failed to download metadata for TXID " + txid + " failed to parse into JSON.", __TAG);

    return null;
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
            if (file.Metadata_Size > Settings.Config.MetadataMaxSize)
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


module.exports = { ArFSEntity, ArFSFile, ArFSURL, ArFSDrive, ListDrives, ListDriveFiles, DownloadFile };