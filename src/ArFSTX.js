//
// *****************************
// *** Silanael ARweave Tool ***
// *****************************
//
// ArFSTX.js - 2021-11-27_01
//
// ArFS-transaction

const Sys         = require ("./System");
const Const_ArFS  = require ("./CONST_ARFS");
const Transaction = require ("./Transaction");
const Settings    = require ("./Settings");
const Util        = require ("./Util");



class ArFSTX extends Transaction
{
    EntityObj  = null;
    ArFSFields = {};
    Encrypted  = null;


    constructor (parent_entity, txid = null)
    {
        super (txid);

        if (parent_entity == null)
        {
            this.SetInvalid ();
            Sys.ERR_PROGRAM ("Parent entity not given for TXID:" + txid + " !", "ArFSMTX");
        }
        else
            this.EntityObj = parent_entity;
    }


    IsEncrypted () { return this.Encrypted; }


    __OnTXFetched ()
    {
        super.__OnTXFetched ();

        Util.AssignIfNotNull (this.ArFSFields, "ArFS"     , this.GetTagValue (Const_ArFS.TAG_ARFS)           );
        Util.AssignIfNotNull (this.ArFSFields, "Cipher"   , this.GetTagValue (Const_ArFS.TAG_CIPHER)         );
        Util.AssignIfNotNull (this.ArFSFields, "CipherIV" , this.GetTagValue (Const_ArFS.TAG_CIPHER_IV)      );
        this.Encrypted = this.ArFSFields.Cipher != null || this.ArFSFields.CipherIV != null || this.EntityObj?.IsEncrypted ();
    }

}



class ArFSMetaTX extends ArFSTX
{    

    MetaObj      = null;
    TX_Data      = null;


    constructor (parent_entity, txid = null)
    {
        super (parent_entity, txid);
    }

    GetDataTXID   () { return this.ArFSFields.DataTXID != null ? this.ArFSFields.DataTXID : this.TX_Data?.GetTXID (); }
    GetDataTX     () { return this.TX_Data;                 }
    GetArFSName   () { return this.ArFSFields?.Name;        }
    GetArFSID     () { return this.ArFSFields?.ArFSID;      }
    GetEntityType () { return this.ArFSFields?.EntityType;  }
    

    SetFieldsToEntity () 
    { 
        Util.CopyKeysToObj (this.ArFSFields, this.EntityObj);
    }
    

    __OnTXFetched () // Override
    {
        super.__OnTXFetched ();

        Util.AssignIfNotNull (this.ArFSFields, "EntityType"     , this.GetTagValue (Const_ArFS.TAG_ENTITYTYPE)     );
        Util.AssignIfNotNull (this.ArFSFields, "FileID"         , this.GetTagValue (Const_ArFS.TAG_FILEID)         );
        Util.AssignIfNotNull (this.ArFSFields, "DriveID"        , this.GetTagValue (Const_ArFS.TAG_DRIVEID)        ); 
        Util.AssignIfNotNull (this.ArFSFields, "FolderID"       , this.GetTagValue (Const_ArFS.TAG_FOLDERID)       );
        Util.AssignIfNotNull (this.ArFSFields, "ParentFolderID" , this.GetTagValue (Const_ArFS.TAG_PARENTFOLDERID) );        
        Util.AssignIfNotNull (this.ArFSFields, "DrivePrivacy"   , this.GetTagValue (Const_ArFS.TAG_DRIVEPRIVACY)   );
        Util.AssignIfNotNull (this.ArFSFields, "DriveAuthMode"  , this.GetTagValue (Const_ArFS.TAG_DRIVEAUTHMODE)  );

        Util.AssignIfNotNull (this.ArFSFields, "ArFSID"         , this.GetTagValue (Const_ArFS.GetTagForEntityType (this.EntityType) )  );

        this.ArFSFields.Encrypted =  this.ArFSFields.DrivePrivacy == "private" || this.ArFSFields.Cipher != null;
        this.ArFSFields.Public    = !this.ArFSFields.Encrypted;        
    }


    __OnJSONFetched ()
    {        
        if (this.MetaObj != null)
        {
            Util.AssignIfNotNull (this.ArFSFields, "Name"              , this.MetaObj.name             );
            Util.AssignIfNotNull (this.ArFSFields, "RootFolderID"      , this.MetaObj.rootFolderId     );
            Util.AssignIfNotNull (this.ArFSFields, "ReportedFileSizeB" , this.MetaObj.size             );
            Util.AssignIfNotNull (this.ArFSFields, "FileDateUT"        , this.MetaObj.lastModifiedDate );
            Util.AssignIfNotNull (this.ArFSFields, "DataTXID"          , this.MetaObj.dataTxId         );
        }

        const dtxid = this.GetDataTXID ();

        if (this.TX_Data == null && dtxid != null)
        {
            this.TX_Data = new ArFSDataTX (this.EntityObj, dtxid);
            this.EntityObj?.__AddTransaction (this.TX_Data);
            Sys.ERR ("FOO");
        }
    }


    async FetchMetaOBJ ()
    {
        const force = Settings.IsForceful ();
        const txid  = this.GetTXID ();

        if (this.MetaObj != null && !force)
        {
            Sys.DEBUG ("Metadata-object for TXID " + this.GetTXID () + " already fetched. Use --force to re-fetch.");
            return this.MetaObj;
        }

        if (!this.IsValid () && !Sys.ERR_OVERRIDABLE ("Transaction not valid. Use --force to proceed anyway.", "ArFSMetaTx") )
            return null;
        

        if (this.IsEncrypted () )
        {
            Sys.VERBOSE ("ArFS-entity is encrypted, unable to fetch metadata.");
            return this.MetaObj;
        }

        try
        {
            this.MetaObj = JSON.parse (await this.FetchDataStr () );     
            this.__OnJSONFetched ();
            return this.MetaObj;
        }
        catch (exception) { Sys.ON_EXCEPTION (exception, "ArFSMetaTx.FetchMetaOBJ (" + txid + ")"); }   
    


        return null;
    }


}


class ArFSDataTX extends ArFSTX
{    
    
    constructor (parent_entity, txid = null)
    {
        super (parent_entity, txid);    
    }
}



module.exports = { ArFSMetaTX, ArFSDataTX };