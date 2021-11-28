//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFS_DEF.js - 2021-11-19_01
// ArFS-constants.
//

class ArFSDEf
{
    ARFS_VERSION                = "0.11"
        
    TAG_ARFS                    = "ArFS";
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

    IsValidEntityType       (entity_type)   { return this.ARFS_ENTITY_TYPES.includes (entity_type?.toLowerCase () );  }
    GetIDTag                (entity_type)   { return this.ENTITYTYPE_IDTAG_MAP [entity_type]; }
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

};


module.exports = Object.freeze (new ArFSDEf () );