//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFS_DEF.js - 2021-11-19_01
// ArFS-constants.
//

const TXTag = require ("./TXTag.js");
const Util  = require ("./Util.js");


class TXTag_EntityType extends TXTag
{ 
    constructor (value = null)
    {
        super (DEFS.TAG_ENTITYTYPE, value);

        if (value != null && !Array.isArray (value) && !DEFS.IsValidEntityType (value) )
            Sys.WARN ("Unknown entity type '" + value + "' encountered.", "TXTag_EntityType", { error_id: Constants.ERROR_ID_ARFS_ENTITY_TYPE_UNKNOWN });
    }
    
    static GET_VALUE (tags)
    {
        return TXTag.GET_VALUE (tags, DEFS.TAG_ENTITYTYPE);
    }
}


class TXTag_ArFSID extends TXTag
{ 
    constructor (entity_type, arfs_id)
    {
        super (TXTag_ArFSID.GET_TAG_FOR_ENTITYTYPE (entity_type), arfs_id);

        if (arfs_id != null && !Util.IsArFSID (arfs_id) )
            Sys.WARN ("Invalid ArFS-ID '" + value + "'.", "TXTag_ArFSID", { error_id: Constants.ERROR_ID_ARFS_ID_INVALID });
    
        if (entity_type != null && this.Name == null)
            Sys.ERR ("Unknown Entity-Type '" + entity_type + "'.", "TXTag_ArFSID", { error_id: Constants.ERROR_ID_ARFS_ENTITY_TYPE_UNKNOWN });        
    }

    static GET_TAG_FOR_ENTITYTYPE (entity_type) { return DEFS.GetTagForEntityType (entity_type); }

    static GET_VALUE (tags, entity_type)
    {
        return TXTag.GET_VALUE (tags, TXTag_ArFSID.GET_TAG_FOR_ENTITYTYPE (entity_type == null ? entity_type : TXTag_EntityType.GET_VALUE (tags) ) );
    }


}

class TXTag_DriveID        extends TXTag_ArFSID { constructor (drive_id)         { super (DEFS.ENTITYTYPE_DRIVE,   drive_id);    } }
class TXTag_FileID         extends TXTag_ArFSID { constructor (file_id)          { super (DEFS.ENTITYTYPE_FILE,    file_id);     } }
class TXTag_FolderID       extends TXTag_ArFSID { constructor (folder_id)        { super (DEFS.ENTITYTYPE_FOLDER,  folder_id);   } }
class TXTag_ParentFolderID extends TXTag        { constructor (parent_folder_id) { super (DEFS.TAG_PARENTFOLDERID, parent_folder_id); } }




class ArFSDEf
{
    ARFS_VERSION                = "0.11"
        
    TAG_ARFS                    = "ArFS";DE
    TAG_FILEID                  = "File-Id";
    TAG_DRIVEID                 = "Drive-Id";
    TAG_FOLDERID                = "Folder-Id";
    TAG_PARENTFOLDERID          = "Parent-Folder-Id";
    TAG_DRIVEPRIVACY            = "Drive-Privacy";
    TAG_ENTITYTYPE              = "Entity-Type";
    TAG_CONTENTTYPE             = "Content-Type";
    TAG_UNIXTIME                = "Unix-Time";
    TAG_CIPHER                  = "Cipher";
    TAG_CIPHER_IV               = "Cipher-IV";
    TAG_DRIVEAUTHMODE           = "Drive-Auth-Mode";
    ENTITYTYPE_FILE             = "file";
    ENTITYTYPE_FOLDER           = "folder";
    ENTITYTYPE_DRIVE            = "drive";

    ARFSENTITYMETA_NAME         = "name";
    ARFSENTITYMETA_ROOTFOLDERID = "rootFolderId";
    ARFSENTITYMETA_DATATXID     = "dataTxId";
    ARFSENTITYMETA_SIZE         = "size";

    ARFSDRIVEPRIVACY_PUBLIC     = "public";
    ARFSDRIVEPRIVACY_PRIVATE    = "private";

    METADATA_CONTENT_TYPES      = ["application/json"];

    ENTITYTYPE_IDTAG_MAP =
    {
       [this.ENTITYTYPE_DRIVE]  : this.TAG_DRIVEID,
       [this.ENTITYTYPE_FILE]   : this.TAG_FILEID,
       [this.ENTITYTYPE_FOLDER] : this.TAG_FOLDERID
    };

    ARFS_ENTITY_TYPES      = [this.ENTITYTYPE_DRIVE, this.ENTITYTYPE_FILE, this.ENTITYTYPE_FOLDER];  
    ENTITYTYPES_INFOLDER   = [this.ENTITYTYPE_FILE,  this.ENTITYTYPE_FOLDER]; // Things that may be contained by folders.

    ENTITYSYMBOLS          = { [this.ENTITYTYPE_DRIVE] : 'D', [this.ENTITYTYPE_FOLDER] : 'd', [this.ENTITYTYPE_FILE] : '-'}

    IsValidEntityType       (entity_type)   { return entity_type != null && this.ARFS_ENTITY_TYPES.includes (entity_type.toLowerCase () );  }
    GetTagForEntityType     (entity_type)   { return entity_type != null ? this.ENTITYTYPE_IDTAG_MAP [entity_type] : null; }
    GetEntitySymbol         (entity_type)   { const s = this.ENTITYSYMBOLS [entity_type]; return s != null ? s : '?'; }
    IsFile                  (entity_type)   { return entity_type == this.ENTITYTYPE_FILE;   }
    IsFolder                (entity_type)   { return entity_type == this.ENTITYTYPE_FOLDER; }
    IsDrive                 (entity_type)   { return entity_type == this.ENTITYTYPE_DRIVE;  }

    GetEntityTypeFromTX     (s_transaction) { return s_transaction?.GetTagValue (this.TAG_ENTITYTYPE);     }
    GetDriveIDFromTX        (s_transaction) { return s_transaction?.GetTagValue (this.TAG_DRIVEID);        }
    GetFileIDFromTX         (s_transaction) { return s_transaction?.GetTagValue (this.TAG_FILEID);         } 
    GetFolderIDFromTX       (s_transaction) { return s_transaction?.GetTagValue (this.TAG_FOLDERID);       }
    GetParentFolderIDFromTX (s_transaction) { return s_transaction?.GetTagValue (this.TAG_PARENTFOLDERID); }
    GetUnixTimeFromTX       (s_transaction) { return s_transaction?.GetTagValue (this.TAG_UNIXTIME);       }

    TXTag_EntityType       = TXTag_EntityType;
    TXTag_ArFSID           = TXTag_ArFSID;
    TXTag_DriveID          = TXTag_DriveID;
    TXTag_FileID           = TXTag_FileID;
    TXTag_FolderID         = TXTag_FolderID;
    TXTag_ParentFolderID   = TXTag_ParentFolderID;

    DidArDriveFuckUpTheFileDate (new_utms, old_utms) { return !isNaN (new_utms) && !isNaN (old_utms) && new_utms == Math.floor (old_utms / 1000) * 1000; }

    // Try to figure out which TX is newer based on the Unix-Time -tag.
    // This is NOT reliable, as someone doing a snipe-attack could watch the mempool
    // and post their own initial entity transaction with a lower Unix-Time value,
    // but it's all we got to work with.
    ChooseNewestTXFromSameBlock (tx1, tx2, seek_newest)
    {        
        const tx1_ut = tx1?.GetTagValue (this.TAG_UNIXTIME);
        const tx2_ut = tx2?.GetTagValue (this.TAG_UNIXTIME);

        if (tx1_ut == tx2_ut || seek_newest == null)
            return { choice: null, drop: null, ut1: tx1_ut, ut2: tx2_ut }
        
        if ( (tx1_ut == null && tx2_ut != null) || tx1_ut < tx2_ut)
            return seek_newest ? { choice: tx2, drop: tx1, ut1: tx1_ut, ut2: tx2_ut } : { choice: tx1, drop: tx2, ut1: tx1_ut, ut2: tx2_ut }

        else 
            return seek_newest ? { choice: tx1, drop: tx2, ut1: tx1_ut, ut2: tx2_ut } : { choice: tx2, drop: tx1, ut1: tx1_ut, ut2: tx2_ut }


    }
};

const DEFS = Object.freeze (new ArFSDEf () );




module.exports = DEFS;