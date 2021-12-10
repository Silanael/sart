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
const State       = require ("./ProgramState");
const Transaction = require ("./Transaction");
const TXGroup     = require ("./TXGroup");
const Settings    = require ("./Config");
const Util        = require ("./Util");



class ArFSTX extends Transaction
{
    EntityObj  = null;
    ArFSFields = {};
    Encrypted  = null;


    constructor (entity_obj, txid = null)
    {
        super (txid);
        this.SetEntityObj (entity_obj)        
    }


    IsEncrypted   ()       { return this.Encrypted;  }
    GetArFSFields ()       { return this.ArFSFields; }
    SetEntityObj  (entity) { this.EntityObj = entity; } 


    __OnTXFetched ()
    {
        super.__OnTXFetched ();

        Util.AssignIfNotNull (this.ArFSFields, "ArFS"     , this.GetTagValue (Const_ArFS.TAG_ARFS)           );
        Util.AssignIfNotNull (this.ArFSFields, "Cipher"   , this.GetTagValue (Const_ArFS.TAG_CIPHER)         );
        Util.AssignIfNotNull (this.ArFSFields, "CipherIV" , this.GetTagValue (Const_ArFS.TAG_CIPHER_IV)      );
        this.Encrypted = this.ArFSFields.Cipher != null || this.ArFSFields.CipherIV != null || this.EntityObj?.IsEncrypted ();

        if (! Util.IsSet (this.ArFSFields.ArFS) && ! this.OnError ("TX-tag '" + Const_ArFS.TAG_ARFS 
                                                           + "' missing - may indicate that this isn't an ArFS-transaction.", this) )
            this.SetInvalid ();

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

    static FROM_GQL_EDGE (edge, parent_entity = null) { return new ArFSMetaTX (parent_entity).SetGQLEdge (edge); }


    GetDataTXID   () { return this.ArFSFields.DataTXID != null ? this.ArFSFields.DataTXID : this.TX_Data?.GetTXID (); }
    GetDataTX     () { return this.TX_Data;                 }
    GetArFSName   () { return this.ArFSFields?.Name;        }
    GetArFSID     () { return this.ArFSFields?.ArFSID;      }
    GetEntityType () { return this.ArFSFields?.EntityType;  }
    GetTypeShort  () { return "META";                       }


    SetFieldsToEntity () 
    { 
        if (this.EntityObj != null)
            Util.CopyKeysToObj (this.ArFSFields, this.EntityObj);
        else
            Sys.ERR_PROGRAM ("SetFieldsToEntity: EntityObj not set!", this);
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
                
        if (!Util.IsSet (this.ArFSFields.EntityType) && ! this.OnError ("TX-tag '" + Const_ArFS.TAG_ENTITYTYPE 
                                                           + "' missing - may indicate that this isn't an ArFS-transaction.", this) )
            this.SetInvalid ();
      
            
    }


    __OnJSONFetched ()
    {        
        if (this.MetaObj != null)
        {
            const json = this.MetaObj;
            Util.AssignIfNotNull (this.ArFSFields, "Name"               , json.name                            );            
            Util.AssignIfNotNull (this.ArFSFields, "RootFolderID"       , json.rootFolderId                    );            
            Util.AssignIfNotNull (this.ArFSFields, "DataTXID"           , json.dataTxId                        );
            Util.AssignIfNotNull (this.ArFSFields, "DataContentType"    , json.dataContentType                 );            
            Util.AssignIfNotNull (this.ArFSFields, "FileDate"           , json.lastModifiedDate != null ? Util.GetDate (json.lastModifiedDate / 1000)    : null);
            Util.AssignIfNotNull (this.ArFSFields, "FileDate_UTMS"      , json.lastModifiedDate                );
            Util.AssignIfNotNull (this.ArFSFields, "ReportedFileSize"   , json.size != null ? Util.GetSizeStr (json.size, true, State.Config.SizeDigits) : null);            
            Util.AssignIfNotNull (this.ArFSFields, "ReportedFileSize_B" , json.size                            );            
            
            
        }

        const dtxid = this.GetDataTXID ();

        if (this.TX_Data == null && dtxid != null)
        {
            this.TX_Data = new ArFSDataTX (this.EntityObj, dtxid);
            this.EntityObj?.__AddTransaction (this.TX_Data, true);            
        }
    }


    async FetchMetaOBJ ()
    {
        const force = Settings.IsForceful ();
        const txid  = this.GetTXID ();

        if (this.MetaObj != null && !force)
        {
            Sys.VERBOSE ("Metadata-object for TXID " + this.GetTXID () + " already fetched. Use --force to re-fetch.");
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

            Sys.VERBOSE ("Fetched metadata-JSON for " + this + ".");
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

    GetTypeShort  () { return "DATA"; }
}


function MetaTXGroupFromQuery (query, parent_entity = null)
{
    const txgroup = new TXGroup (query.GetSort () );
        
    if (query != null && query.HasEdges () )
    {
        for (const e of query.GetEdges () )
        { 
            txgroup.Add (new ArFSMetaTX (parent_entity).SetGQLEdge (e) )                
        }        
    }
    return txgroup;
}



module.exports = { ArFSMetaTX, ArFSDataTX, ArFSTX, MetaTXGroupFromQuery };